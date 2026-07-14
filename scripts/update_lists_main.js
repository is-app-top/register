const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getChangedDomainFilesFromPush(beforeSha, afterSha) {
  const diffCmd = `git diff --name-status ${beforeSha} ${afterSha}`;
  const out = execSync(diffCmd).toString().trim();
  if (!out) return [];
  const lines = out.split('\n');
  const files = [];
  for (const line of lines) {
    const [status, filePath] = line.split('\t');
    if (!filePath) continue;
    if (!filePath.startsWith('domains/') || !filePath.endsWith('.json')) continue;
    files.push({ status, filePath });
  }
  return files;
}

function extractName(filePath) {
  const base = path.basename(filePath);
  const parts = base.split('.');
  if (parts.length < 4) return null;
  return parts[0];
}

function listExistingNamesWithRecords() {
  const domainsDir = path.join(process.cwd(), 'domains');
  const names = new Set();
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(p);
      } else if (e.isFile() && e.name.endsWith('.json')) {
        const base = path.basename(p);
        const parts = base.split('.');
        if (parts.length >= 4 && parts.slice(-3).join('.') === 'is-app.top.json') {
          try {
            const raw = fs.readFileSync(p, 'utf8');
            const json = JSON.parse(raw);
            const recs = json.records || {};
            const hasAnyRecord =
              recs &&
              typeof recs === 'object' &&
              Object.keys(recs).some((k) => Array.isArray(recs[k]) && recs[k].length > 0);
            if (hasAnyRecord) {
              names.add(parts[0]);
            }
          } catch {}
        }
      }
    }
  }
  walk(domainsDir);
  return Array.from(names);
}

function readListFile(listPath) {
  if (!fs.existsSync(listPath)) return {};
  const lines = fs.readFileSync(listPath, 'utf8').split('\n').map(l => l.trim()).filter(Boolean);
  const map = {};
  for (const line of lines) {
    const m = line.match(/^([^:]+):\s*"([^"]+)"$/);
    if (m) {
      map[m[1]] = m[2];
    }
  }
  return map;
}

function writeListFile(listPath, map) {
  const entries = Object.keys(map).sort().map(name => `${name}: "${map[name]}"`);
  fs.writeFileSync(listPath, entries.join('\n') + (entries.length ? '\n' : ''), 'utf8');
}

try {
  const before = process.env.BEFORE_SHA;
  const after = process.env.AFTER_SHA;
  if (!before || !after) {
    console.log('Missing BEFORE_SHA/AFTER_SHA, skipping lists update.');
    process.exit(0);
  }

  const listPath = path.join(process.cwd(), 'lists.txt');
  const oldMap = readListFile(listPath);

  // Recompute the map purely from the current repo contents.
  const existingNames = listExistingNamesWithRecords();
  const newMap = {};
  for (const name of existingNames) newMap[name] = 'active';

  // Compare old and new maps
  const oldStr = JSON.stringify(oldMap);
  const newStr = JSON.stringify(newMap);
  if (oldStr !== newStr) {
    writeListFile(listPath, newMap);
    console.log('lists.txt updated to active.');
  } else {
    console.log('lists.txt not changed.');
  }
} catch (e) {
  console.error('Failed updating lists.txt (main):', e.message);
  process.exit(1);
}
