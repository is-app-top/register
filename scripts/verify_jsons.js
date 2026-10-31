const fs = require('fs');
const net = require('net');
const path = require('path');
const Ajv = require('ajv');

const schema = require('./schema.json');
const RESERVED_NAMES = new Set(
    require('./reserved_names.json').map((name) => name.toLowerCase())
);

const DOMAIN_NAME = 'is-app.top';
const MAX_DOMAINS_PER_USER = 10;
const SPECIAL_SUBDOMAINS = new Set(['@', '_gh-is-app-top-o']);

const ajv = new Ajv({ allErrors: true, strict: false });
const validateSchema = ajv.compile(schema);

function isReservedPath(filePath) {
    return filePath.includes(path.join('domains', 'reserved'));
}

function isValidEmail(email) {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
}

function verifySubdomainMatch(subdomain, filePath) {
    const fileName = path.basename(filePath);
    const fileNameSubdomain = fileName.split('.')[0];

    if (SPECIAL_SUBDOMAINS.has(subdomain.toLowerCase())) {
        return true;
    }

    return fileNameSubdomain.toLowerCase() === subdomain.toLowerCase();
}

function verifyFileFormat(fileName, reserved = false) {
    const normalPattern = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.is-app\.top\.json$/;
    const reservedPattern = /^(@|_gh-is-app-top-o)\.is-app\.top\.json$/;

    if (reserved) {
        return normalPattern.test(fileName) || reservedPattern.test(fileName);
    }

    return normalPattern.test(fileName);
}

function isValidIP(ip) {
    return net.isIP(ip) === 4 || net.isIP(ip) === 6;
}

function isValidDomain(domain) {
    if (typeof domain !== 'string') return false;

    const normalized = domain.replace(/\.$/, '').toLowerCase();
    if (!normalized || normalized.length > 253) return false;

    const pattern = /^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
    if (!pattern.test(normalized)) return false;

    return normalized.split('.').every((label) => label.length <= 63);
}

function normalizeDomain(domain) {
    return domain.replace(/\.$/, '').toLowerCase();
}

function isUnderRegisteredDomain(domain) {
    const normalized = normalizeDomain(domain);
    return normalized === DOMAIN_NAME || normalized.endsWith(`.${DOMAIN_NAME}`);
}

function formatAjvError(error) {
    const field = error.instancePath
        ? error.instancePath.replace(/^\//, '').replace(/\//g, '.')
        : 'document';
    return `${field} ${error.message}`;
}

function validateRecords(records, subdomain, isReserved) {
    const errors = [];

    const types = Object.keys(records);
    if (types.length === 0) {
        errors.push(':ERROR: At least one DNS record is required.');
        return errors;
    }

    if (records.CNAME) {
        if (!Array.isArray(records.CNAME) || records.CNAME.length !== 1) {
            errors.push(':ERROR: CNAME must contain exactly one target.');
        }
        const otherTypes = types.filter((type) => type !== 'CNAME');
        if (otherTypes.length > 0) {
            errors.push(`:ERROR: CNAME cannot be combined with other record types (${otherTypes.join(', ')}).`);
        }
    }

    for (const type of types) {
        const values = records[type];
        if (!Array.isArray(values)) continue;

        for (const value of values) {
            switch (type) {
                case 'A':
                    if (!isValidIP(value) || net.isIP(value) !== 4) {
                        errors.push(`:ERROR: Invalid A record (IPv4 expected): ${value}`);
                    }
                    break;

                case 'AAAA':
                    if (!isValidIP(value) || net.isIP(value) !== 6) {
                        errors.push(`:ERROR: Invalid AAAA record (IPv6 expected): ${value}`);
                    }
                    break;

                case 'CNAME': {
                    if (!isValidDomain(value)) {
                        errors.push(`:ERROR: Invalid CNAME record: ${value}. Must be a valid domain. Remove 'http://' or 'https://', do not trail with '/'`);
                        break;
                    }
                    const target = normalizeDomain(value);
                    const ownFqdn = `${subdomain.toLowerCase()}.${DOMAIN_NAME}`;
                    if (target === DOMAIN_NAME || target === ownFqdn) {
                        errors.push(`:ERROR: CNAME record cannot point to the apex or to itself: ${value}`);
                    }
                    break;
                }

                case 'NS': {
                    if (!isValidDomain(value)) {
                        errors.push(`:ERROR: Invalid NS record: ${value}. Must be a valid domain. Remove 'http://' or 'https://', do not trail with '/'`);
                        break;
                    }
                    const target = normalizeDomain(value);
                    if (!isReserved && isUnderRegisteredDomain(target)) {
                        errors.push(`:ERROR: NS record cannot point inside ${DOMAIN_NAME}: ${value}`);
                    }
                    break;
                }

                case 'MX': {
                    const target = typeof value === 'string' ? value : value && value.target;
                    if (!isValidDomain(target)) {
                        errors.push(`:ERROR: Invalid MX record: ${JSON.stringify(value)}. Must be a valid domain. Remove 'http://' or 'https://', do not trail with '/'`);
                        break;
                    }
                    if (isUnderRegisteredDomain(target)) {
                        errors.push(`:ERROR: MX record cannot point inside ${DOMAIN_NAME}: ${target}`);
                    }
                    break;
                }

                case 'TXT':
                    if (typeof value !== 'string') {
                        errors.push(`:ERROR: Invalid TXT record: ${value}`);
                    } else if (value.length > 255) {
                        errors.push(`:ERROR: TXT record exceeds the 255 character limit: ${value.slice(0, 40)}...`);
                    }
                    break;
            }
        }
    }

    return errors;
}

function validateJson(jsonData, filePath) {
    const errors = [];
    const fileName = path.basename(filePath);
    const reserved = isReservedPath(filePath);

    if (!validateSchema(jsonData)) {
        for (const error of validateSchema.errors || []) {
            errors.push(`:ERROR: ${formatAjvError(error)}`);
        }
    }

    if (typeof jsonData !== 'object' || jsonData === null || Array.isArray(jsonData)) {
        return errors;
    }

    if (!reserved) {
        if (!verifyFileFormat(fileName, false)) {
            errors.push(`:ERROR: Only third-level domains are supported. Rename your JSON to this format: 'SUBDOMAIN.is-app.top.json'.`);
        }

        if (SPECIAL_SUBDOMAINS.has(String(jsonData.subdomain || '').toLowerCase())) {
            errors.push(`:ERROR: '${jsonData.subdomain}' is a reserved subdomain and can only be used in domains/reserved/.`);
        }
    } else if (!verifyFileFormat(fileName, true)) {
        errors.push(`:ERROR: Reserved JSON must be named '@.is-app.top.json' or 'SUBDOMAIN.is-app.top.json'.`);
    }

    const subdomain = typeof jsonData.subdomain === 'string' ? jsonData.subdomain : '';

    if (subdomain) {
        if (subdomain.includes('*')) {
            errors.push(':ERROR: Subdomain cannot contain wildcards.');
        } else if (!reserved && !verifySubdomainMatch(subdomain, filePath)) {
            errors.push(':ERROR: Ensure the subdomain specified in the JSON file matches the subdomain present in the file name.');
        }

        if (!reserved && RESERVED_NAMES.has(subdomain.toLowerCase())) {
            errors.push(`:ERROR: '${subdomain}' is reserved and cannot be registered.`);
        }
    }

    const publicEmail = typeof jsonData.public_email === 'string' ? jsonData.public_email : '';
    const contactInfo = typeof jsonData.email_or_discord === 'string' ? jsonData.email_or_discord : '';

    if (publicEmail) {
        if (!isValidEmail(publicEmail)) {
            errors.push(':ERROR: Invalid email in the JSON.');
        }
    } else if (!contactInfo) {
        errors.push(':ERROR: Please provide your contact info in the JSON.');
    }

    if (jsonData.records && typeof jsonData.records === 'object' && !Array.isArray(jsonData.records)) {
        errors.push(...validateRecords(jsonData.records, subdomain, reserved));
    }

    return errors;
}

function getAllFiles(domainsPath) {
    const allFiles = [];

    function collect(dirPath) {
        if (!fs.existsSync(dirPath)) return;
        for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
            const entryPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                collect(entryPath);
            } else if (entry.isFile() && entry.name.endsWith('.json')) {
                allFiles.push(entryPath);
            }
        }
    }

    collect(domainsPath);
    return allFiles;
}

function validateAll(domainsPath) {
    const files = getAllFiles(domainsPath);
    const errors = [];
    const subdomainOwners = new Map();
    const userCounts = new Map();

    for (const filePath of files) {
        let jsonData;
        try {
            jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        } catch (error) {
            errors.push(`File: ${filePath} - :ERROR: Invalid JSON (${error.message}).`);
            continue;
        }

        for (const error of validateJson(jsonData, filePath)) {
            errors.push(`File: ${filePath} - ${error}`);
        }

        if (jsonData && typeof jsonData === 'object') {
            const subdomain = String(jsonData.subdomain || '').toLowerCase();
            if (subdomain) {
                if (!subdomainOwners.has(subdomain)) subdomainOwners.set(subdomain, []);
                subdomainOwners.get(subdomain).push(filePath);
            }

            const username = String(jsonData.github_username || '').toLowerCase();
            if (username) {
                userCounts.set(username, (userCounts.get(username) || 0) + 1);
            }
        }
    }

    for (const [subdomain, owners] of subdomainOwners) {
        if (owners.length > 1) {
            errors.push(`:ERROR: Duplicate subdomain '${subdomain}' found in: ${owners.join(', ')}`);
        }
    }

    for (const [username, count] of userCounts) {
        if (count > MAX_DOMAINS_PER_USER) {
            errors.push(`:ERROR: '${username}' has ${count} subdomains; the limit is ${MAX_DOMAINS_PER_USER}.`);
        }
    }

    return errors;
}

function main() {
    const domainsPath = path.join(__dirname, '..', 'domains');
    const reportPath = process.env.VALIDATION_REPORT || path.join(process.cwd(), 'validation_errors.txt');
    const errors = validateAll(domainsPath);

    if (errors.length > 0) {
        const report = `Validation errors found:\n\n${errors.map((error) => `- ${error}`).join('\n')}\n`;
        console.error(report);
        try {
            fs.writeFileSync(reportPath, report, 'utf8');
        } catch (error) {
            console.error(`Could not write validation report: ${error.message}`);
        }
        process.exit(1);
    }

    if (fs.existsSync(reportPath)) {
        fs.unlinkSync(reportPath);
    }
    console.log('JSON files content is valid.');
}

if (require.main === module) {
    main();
}

module.exports = {
    DOMAIN_NAME,
    MAX_DOMAINS_PER_USER,
    RESERVED_NAMES,
    isValidEmail,
    isValidIP,
    isValidDomain,
    isUnderRegisteredDomain,
    normalizeDomain,
    verifyFileFormat,
    verifySubdomainMatch,
    validateJson,
    validateAll,
    getAllFiles,
    main,
};
