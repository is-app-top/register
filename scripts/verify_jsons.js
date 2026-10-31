const fs = require('fs');
const net = require('net');
const path = require('path');

const RESERVED_NAMES = new Set(
    require('./reserved_names.json').map((name) => name.toLowerCase())
);

const DOMAIN_NAME = 'is-app.top';
const MAX_DOMAINS_PER_USER = 10;
const SPECIAL_SUBDOMAINS = new Set(['@', '_gh-is-app-top-o']);
const ALLOWED_FIELDS = new Set([
    'subdomain',
    'domain',
    'email_or_discord',
    'public_email',
    'github_username',
    'description',
    'ttl',
    'records',
]);
const ALLOWED_RECORD_TYPES = new Set(['A', 'AAAA', 'CNAME', 'NS', 'MX', 'TXT']);
const SUBDOMAIN_PATTERN = /^(@|_gh-is-app-top-o|[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)$/;
const GITHUB_USERNAME_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isReservedPath(filePath) {
    return filePath.includes(path.join('domains', 'reserved'));
}

function isValidEmail(email) {
    return typeof email === 'string' && EMAIL_PATTERN.test(email);
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

function validateMxEntry(entry, index) {
    const errors = [];

    if (typeof entry === 'string') {
        if (!entry) errors.push(`:ERROR: MX[${index}] must be a non-empty string.`);
        return errors;
    }

    if (!isPlainObject(entry)) {
        errors.push(`:ERROR: MX[${index}] must be a string or an object with 'priority' and 'target'.`);
        return errors;
    }

    for (const key of Object.keys(entry)) {
        if (key !== 'priority' && key !== 'target') {
            errors.push(`:ERROR: MX[${index}] has an unknown field '${key}'.`);
        }
    }

    if (!Number.isInteger(entry.priority) || entry.priority < 0 || entry.priority > 65535) {
        errors.push(`:ERROR: MX[${index}].priority must be an integer between 0 and 65535.`);
    }
    if (typeof entry.target !== 'string' || !entry.target) {
        errors.push(`:ERROR: MX[${index}].target must be a non-empty string.`);
    }

    return errors;
}

function validateShape(jsonData) {
    const errors = [];

    if (!isPlainObject(jsonData)) {
        errors.push(':ERROR: document must be a JSON object.');
        return errors;
    }

    for (const field of Object.keys(jsonData)) {
        if (!ALLOWED_FIELDS.has(field)) {
            errors.push(`:ERROR: Unknown field '${field}'.`);
        }
    }

    for (const field of ['subdomain', 'domain', 'github_username', 'description', 'records']) {
        if (!(field in jsonData) || jsonData[field] === undefined) {
            errors.push(`:ERROR: Missing required field '${field}'.`);
        }
    }

    if (jsonData.subdomain !== undefined) {
        if (typeof jsonData.subdomain !== 'string') {
            errors.push(':ERROR: subdomain must be a string.');
        } else if (jsonData.subdomain.length < 1 || jsonData.subdomain.length > 63) {
            errors.push(':ERROR: subdomain must be between 1 and 63 characters.');
        } else if (!SUBDOMAIN_PATTERN.test(jsonData.subdomain)) {
            errors.push(':ERROR: subdomain contains invalid characters.');
        }
    }

    if (jsonData.domain !== undefined && jsonData.domain !== DOMAIN_NAME) {
        errors.push(':ERROR: Domain is invalid.');
    }

    if (jsonData.email_or_discord !== undefined) {
        if (typeof jsonData.email_or_discord !== 'string' || !jsonData.email_or_discord) {
            errors.push(':ERROR: email_or_discord must be a non-empty string.');
        }
    }

    if (jsonData.public_email !== undefined) {
        if (!isValidEmail(jsonData.public_email)) {
            errors.push(':ERROR: Invalid email in the JSON.');
        }
    }

    if (!jsonData.public_email && !jsonData.email_or_discord) {
        errors.push(':ERROR: Please provide your contact info (email_or_discord or public_email) in the JSON.');
    }

    if (jsonData.github_username !== undefined) {
        if (typeof jsonData.github_username !== 'string' || !jsonData.github_username) {
            errors.push(':ERROR: Please provide your GitHub username in the JSON.');
        } else if (
            jsonData.github_username.length > 39 ||
            !GITHUB_USERNAME_PATTERN.test(jsonData.github_username)
        ) {
            errors.push(':ERROR: github_username is not a valid GitHub username.');
        }
    }

    if (jsonData.description !== undefined) {
        if (typeof jsonData.description !== 'string' || !jsonData.description) {
            errors.push(':ERROR: Description is empty.');
        } else if (jsonData.description.length < 15) {
            errors.push(':ERROR: Description is too short. Please provide a description of your website.');
        } else if (jsonData.description.length > 500) {
            errors.push(':ERROR: Description must be 500 characters or fewer.');
        }
    }

    if (jsonData.ttl !== undefined) {
        if (!Number.isInteger(jsonData.ttl) || jsonData.ttl < 60 || jsonData.ttl > 86400) {
            errors.push(':ERROR: ttl must be an integer between 60 and 86400.');
        }
    }

    if (jsonData.records !== undefined) {
        if (!isPlainObject(jsonData.records)) {
            errors.push(':ERROR: Records must be an object.');
        } else if (Object.keys(jsonData.records).length === 0) {
            errors.push(':ERROR: At least one DNS record is required.');
        } else {
            for (const [type, values] of Object.entries(jsonData.records)) {
                if (!ALLOWED_RECORD_TYPES.has(type)) {
                    errors.push(`:ERROR: Invalid record type: ${type}`);
                    continue;
                }

                if (!Array.isArray(values)) {
                    errors.push(`:ERROR: ${type} record must be an array. Check your JSON syntax.`);
                    continue;
                }

                if (values.length === 0) {
                    errors.push(`:ERROR: ${type} record must contain at least one value.`);
                    continue;
                }

                values.forEach((value, index) => {
                    if (type === 'MX') {
                        errors.push(...validateMxEntry(value, index));
                    } else if (typeof value !== 'string' || !value) {
                        errors.push(`:ERROR: ${type}[${index}] must be a non-empty string.`);
                    }
                });
            }
        }
    }

    return errors;
}

function validateRecords(records, subdomain, isReserved) {
    const errors = [];
    const types = Object.keys(records);

    if (types.length === 0) {
        return errors;
    }

    if (records.CNAME) {
        if (!Array.isArray(records.CNAME) || records.CNAME.length !== 1) {
            errors.push(':ERROR: CNAME must contain exactly one target.');
        }
        const otherTypes = types.filter((type) => type !== 'CNAME');
        if (otherTypes.length > 0) {
            errors.push(`:ERROR: CNAME cannot be combined with other records at the same name (found: ${otherTypes.join(', ')}). Remove them; TXT verification is not required.`);
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
                    if (typeof value === 'string' && value.length > 255) {
                        errors.push(`:ERROR: TXT record exceeds the 255 character limit: ${value.slice(0, 40)}...`);
                    }
                    break;
            }
        }
    }

    return errors;
}

function validateJson(jsonData, filePath) {
    const errors = validateShape(jsonData);
    const fileName = path.basename(filePath);
    const reserved = isReservedPath(filePath);

    if (!isPlainObject(jsonData)) {
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

    if (isPlainObject(jsonData.records)) {
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

        if (isPlainObject(jsonData)) {
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
