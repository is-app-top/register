const fs = require('fs');
const path = require('path');

const RESERVED_NAMES = require('./reserved_names.json');

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
            const json = JSON.parse(fs.readFileSync(p, 'utf8'));
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

function stableStringify(map) {
  const sorted = {};
  for (const key of Object.keys(map).sort()) {
    sorted[key] = map[key];
  }
  return JSON.stringify(sorted);
}

try {
  const listPath = path.join(process.cwd(), 'lists.txt');
  const oldMap = readListFile(listPath);

  // Recompute the map purely from the current repo contents.
  const newMap = {};
  for (const name of RESERVED_NAMES) newMap[name] = 'reserved';
  for (const name of listExistingNamesWithRecords()) newMap[name] = 'active';

  const oldStr = stableStringify(oldMap);
  const newStr = stableStringify(newMap);
  if (oldStr !== newStr) {
    writeListFile(listPath, newMap);
    console.log('lists.txt updated.');
  } else {
    console.log('lists.txt not changed.');
  }
} catch (e) {
  console.error('Failed updating lists.txt (main):', e.message);
  process.exit(1);
}
