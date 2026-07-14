const fs = require('fs');
const path = require('path');

function isValidEmail(email) {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
}

function verifySubdomainMatch(subdomain, filePath) {    
    const fileName = path.basename(filePath);
    const fileNameSubdomain = fileName.split('.')[0];

    const specialCases = ["_gh-is-app-top-o"];

    if (specialCases.includes(subdomain.toLowerCase())) {
        return true;
    }

    if (fileNameSubdomain.toLowerCase() === subdomain.toLowerCase()) {
        return true;
    }

    return false;
}

function verifyFileFormat(fileName) {
    const pattern = /^(@|[a-zA-Z0-9\-]+|_gh-is-app-top-o)\.is-app\.top\.json$/; 

    const specialCases = ["@", "_gh-is-app-top-o"];

    for (let i = 0; i < specialCases.length; i++) {
        if (fileName.startsWith(specialCases[i] + ".is-app.top.json")) {
            return pattern.test(fileName);
        }
    }

    const fileNameParts = fileName.split('.');
    if (fileNameParts.length !== 4 || !pattern.test(fileName)) {
        return false;
    }

    return true;
}

function isValidIP(ip) {
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Pattern = /^([0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4}$/;
    return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
}

function isValidDomain(domain) {
    const pattern = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/;
    return pattern.test(domain);
}

function validateJson(jsonData, filePath) {
    const errors = [];
    const fileName = path.basename(filePath);
    const isReserved = filePath.includes(path.join('domains', 'reserved'));

    if (!isReserved) {
        if (!verifyFileFormat(fileName)) {
            errors.push(`:ERROR: Only third-level domains are supported. Rename your JSON to this format: 'SUBDOMAIN.is-app.top.json'.`);
        }
    }

    const subdomain = jsonData.subdomain || '';
    if (!subdomain) {
        errors.push(':ERROR: Subdomain is empty.');
    } else if (subdomain.includes('*')) {
        errors.push(':ERROR: Subdomain cannot contain wildcards.');
    } else if (!isReserved) {
        if (!verifySubdomainMatch(subdomain, filePath)) {
            errors.push(':ERROR: Ensure the subdomain specified in the JSON file matches the subdomain present in the file name.');
        }
    }

    const domain = jsonData.domain || '';
    if (!domain || domain !== "is-app.top") {
        errors.push(':ERROR: Domain is invalid.');
    }

    const publicEmail = jsonData.public_email || '';
    const contactInfo = jsonData.email_or_discord || '';

    if (publicEmail) {
        if (!isValidEmail(publicEmail)) {
            errors.push(':ERROR: Invalid email in the JSON.');
        }
    } else if (!contactInfo) {
        errors.push(':ERROR: Please provide your contact info in the JSON.');
    }

    const github_username = jsonData.github_username || '';
    if (!github_username) {
        errors.push(':ERROR: Please provide your GitHub username in the JSON.');
    }

    const description = jsonData.description || '';
    if (!description) {
        errors.push(':ERROR: Description is empty.');
    } else if (description.length < 15) {
        errors.push(':ERROR: Description is too short. Please provide a description of your website.');
    }

    const records = jsonData.records || {};
    if (typeof records !== 'object') {
        errors.push(':ERROR: Records must be an object.');
    } else {
        const validRecordTypes = ['A', 'AAAA', 'CNAME', 'NS', 'MX', 'TXT'];

        for (const [type, values] of Object.entries(records)) {
            if (!validRecordTypes.includes(type)) {
                errors.push(`:ERROR: Invalid record type: ${type}`);
                continue;
            }

            if (!Array.isArray(values)) {
                errors.push(`:ERROR: ${type} record must be an array. Check your JSON syntax.`);
                continue;
            }

            values.forEach((value) => {
                switch (type) {
                    case 'A':
                        if (!isValidIP(value) || value.includes(':')) {
                            errors.push(`:ERROR: Invalid A record (IPv4 expected): ${value}`);
                        }
                        break;

                    case 'AAAA':
                        if (!isValidIP(value) || !value.includes(':')) {
                            errors.push(`:ERROR: Invalid AAAA record (IPv6 expected): ${value}`);
                        }
                        break;

                    case 'CNAME':
                    case 'NS':
                    case 'MX':
                        if (!isValidDomain(value)) {
                            errors.push(`:ERROR: Invalid ${type} record: ${value}. Must be a valid domain. Remove 'http://' or 'https://', do not trail with '/'`);
                        }
                        break;

                    case 'TXT':
                        if (typeof value !== 'string') {
                            errors.push(`:ERROR: Invalid TXT record: ${value}`);
                        }
                        break;
                }
            });
        }
    }

    return errors;
}

function main() {
    const domainsPath = path.join(__dirname, '..', 'domains');

    function getAllFiles(dirPath) {
        let allFiles = [];

        const files = fs.readdirSync(dirPath);
        files.forEach(file => {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            if (stats.isFile()) {
                allFiles.push(filePath);
            }
        });

        const reservedPath = path.join(dirPath, 'reserved');
        if (fs.existsSync(reservedPath) && fs.statSync(reservedPath).isDirectory()) {
            const reservedFiles = fs.readdirSync(reservedPath);
            reservedFiles.forEach(file => {
                const filePath = path.join(reservedPath, file);
                const stats = fs.statSync(filePath);
                if (stats.isFile()) {
                    allFiles.push(filePath);
                }
            });
        }

        return allFiles;
    }

    const allFiles = getAllFiles(domainsPath);    
    let allErrors = [];

    allFiles.forEach(filePath => {
        const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const errors = validateJson(jsonData, filePath);

        if (errors.length > 0) {
            allErrors = allErrors.concat(errors.map(error => `File: ${filePath} - ${error}`));
        }
    });

    if (allErrors.length > 0) {
        console.error('Validation errors found:');
        allErrors.forEach(error => console.error(`- ${error}`));
        process.exit(1);
    } else {
        console.log('JSON files content is valid.');
    }
}

main();
