const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');

const {
    isValidDomain,
    isValidIP,
    validateAll,
    validateJson,
    verifyFileFormat,
    verifySubdomainMatch,
} = require('./verify_jsons');

function domainFile(subdomain, reserved = false) {
    return path.join('domains', ...(reserved ? ['reserved'] : []), `${subdomain}.is-app.top.json`);
}

function base(overrides = {}) {
    return {
        subdomain: 'example',
        domain: 'is-app.top',
        email_or_discord: 'user@example.com',
        github_username: 'example-user',
        description: 'A project that is long enough to pass validation.',
        records: { A: ['1.2.3.4'] },
        ...overrides,
    };
}

test('valid A record passes', () => {
    assert.deepEqual(validateJson(base(), domainFile('example')), []);
});

test('CNAME without a TXT record passes', () => {
    const json = base({ records: { CNAME: ['example.com'] } });
    assert.deepEqual(validateJson(json, domainFile('example')), []);
});

test('CNAME with a TXT record passes', () => {
    const json = base({
        records: { CNAME: ['example.com'], TXT: ['provider-verification=abc123'] },
    });
    assert.deepEqual(validateJson(json, domainFile('example')), []);
});

test('CNAME with an MX record passes', () => {
    const json = base({
        records: { CNAME: ['example.com'], MX: [{ priority: 10, target: 'mail.example.com' }] },
    });
    assert.deepEqual(validateJson(json, domainFile('example')), []);
});

test('compressed IPv6 AAAA record passes', () => {
    const json = base({ records: { AAAA: ['2001:db8::1'] } });
    assert.deepEqual(validateJson(json, domainFile('example')), []);
});

test('IPv4 with out-of-range octets fails', () => {
    const json = base({ records: { A: ['999.1.1.1'] } });
    assert.match(validateJson(json, domainFile('example')).join('\n'), /Invalid A record/);
});

test('IPv6 in A record fails', () => {
    const json = base({ records: { A: ['2001:db8::1'] } });
    assert.match(validateJson(json, domainFile('example')).join('\n'), /Invalid A record/);
});

test('multiple CNAME targets fail', () => {
    const json = base({ records: { CNAME: ['a.example.com', 'b.example.com'] } });
    assert.match(validateJson(json, domainFile('example')).join('\n'), /CNAME must contain exactly one target/);
});

test('CNAME combined with an A record fails', () => {
    const json = base({ records: { CNAME: ['a.example.com'], A: ['1.2.3.4'] } });
    assert.match(validateJson(json, domainFile('example')).join('\n'), /CNAME cannot be combined/);
});

test('CNAME combined with an AAAA record fails', () => {
    const json = base({ records: { CNAME: ['a.example.com'], AAAA: ['2001:db8::1'] } });
    assert.match(validateJson(json, domainFile('example')).join('\n'), /CNAME cannot be combined/);
});

test('CNAME combined with an NS record fails', () => {
    const json = base({ records: { CNAME: ['a.example.com'], NS: ['ns1.example.com'] } });
    assert.match(validateJson(json, domainFile('example')).join('\n'), /CNAME cannot be combined/);
});

test('reverse combination A then CNAME fails', () => {
    const json = base({ records: { A: ['1.2.3.4'], CNAME: ['a.example.com'] } });
    assert.match(validateJson(json, domainFile('example')).join('\n'), /CNAME cannot be combined/);
});

test('CNAME with TXT and an A record fails', () => {
    const json = base({
        records: { CNAME: ['a.example.com'], TXT: ['v=spf1 -all'], A: ['1.2.3.4'] },
    });
    assert.match(validateJson(json, domainFile('example')).join('\n'), /CNAME cannot be combined/);
});

test('CNAME pointing at the apex fails', () => {
    const json = base({ records: { CNAME: ['is-app.top'] } });
    assert.match(validateJson(json, domainFile('example')).join('\n'), /apex or to itself/);
});

test('reserved subdomain names fail', () => {
    const json = base({ subdomain: 'www' });
    assert.match(validateJson(json, domainFile('www')).join('\n'), /reserved/);
});

test('filename and subdomain mismatch fails', () => {
    const json = base({ subdomain: 'example' });
    assert.match(validateJson(json, domainFile('other')).join('\n'), /matches the subdomain/);
});

test('NS target inside is-app.top fails', () => {
    const json = base({ records: { NS: ['ns.is-app.top'] } });
    assert.match(validateJson(json, domainFile('example')).join('\n'), /cannot point inside is-app.top/);
});

test('MX object with priority passes', () => {
    const json = base({ records: { MX: [{ priority: 10, target: 'mail.example.com' }] } });
    assert.deepEqual(validateJson(json, domainFile('example')), []);
});

test('MX string target passes', () => {
    const json = base({ records: { MX: ['mail.example.com'] } });
    assert.deepEqual(validateJson(json, domainFile('example')), []);
});

test('TXT record over 255 characters fails', () => {
    const json = base({ records: { TXT: ['x'.repeat(256)] } });
    assert.match(validateJson(json, domainFile('example')).join('\n'), /255 character limit/);
});

test('description shorter than 15 characters fails', () => {
    const json = base({ description: 'too short' });
    assert.match(validateJson(json, domainFile('example')).join('\n'), /description/);
});

test('missing contact information fails', () => {
    const json = base({ email_or_discord: undefined });
    assert.match(validateJson(json, domainFile('example')).join('\n'), /email_or_discord/);
});

test('special @ subdomain is allowed in the reserved directory', () => {
    const json = base({
        subdomain: '@',
        email_or_discord: undefined,
        public_email: 'contact@is-app.top',
        records: { A: ['1.2.3.4'] },
    });
    assert.deepEqual(validateJson(json, domainFile('@', true)), []);
});

test('special @ subdomain is rejected outside the reserved directory', () => {
    const json = base({ subdomain: '@', public_email: 'contact@is-app.top' });
    assert.match(validateJson(json, domainFile('@')).join('\n'), /reserved subdomain/);
});

test('helper validators behave correctly', () => {
    assert.equal(isValidIP('1.2.3.4'), true);
    assert.equal(isValidIP('2001:db8::1'), true);
    assert.equal(isValidIP('999.1.1.1'), false);
    assert.equal(isValidDomain('example.com'), true);
    assert.equal(isValidDomain('example.com.'), true);
    assert.equal(isValidDomain('not a domain'), false);
    assert.equal(verifyFileFormat('example.is-app.top.json'), true);
    assert.equal(verifyFileFormat('a.b.is-app.top.json'), false);
    assert.equal(verifySubdomainMatch('example', domainFile('example')), true);
});

test('duplicate subdomains are reported', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'is-app-dupes-'));
    try {
        fs.writeFileSync(path.join(dir, 'dup.is-app.top.json'), JSON.stringify(base({ subdomain: 'dup' })));
        fs.writeFileSync(path.join(dir, 'dup2.is-app.top.json'), JSON.stringify(base({ subdomain: 'dup' })));
        const errors = validateAll(dir).join('\n');
        assert.match(errors, /Duplicate subdomain 'dup'/);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('per-user domain limit is enforced', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'is-app-limit-'));
    try {
        for (let i = 0; i < 11; i++) {
            const subdomain = `user${i}`;
            fs.writeFileSync(
                path.join(dir, `${subdomain}.is-app.top.json`),
                JSON.stringify(base({ subdomain, github_username: 'alice' }))
            );
        }
        const errors = validateAll(dir).join('\n');
        assert.match(errors, /the limit is 10/);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
