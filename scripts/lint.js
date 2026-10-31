const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const scriptsDir = __dirname;
const repoRoot = path.join(__dirname, '..');

function findFiles(dir, extension) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      files.push(...findFiles(entryPath, extension));
    } else if (entry.isFile() && entry.name.endsWith(extension)) {
      files.push(entryPath);
    }
  }
  return files;
}

let failed = false;

for (const file of findFiles(scriptsDir, '.js')) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    console.log(`Syntax OK: ${path.relative(repoRoot, file)}`);
  } catch (error) {
    failed = true;
    console.error(`Syntax error in ${path.relative(repoRoot, file)}:`);
    console.error(error.stderr ? error.stderr.toString() : error.message);
  }
}

for (const file of findFiles(scriptsDir, '.json')) {
  try {
    JSON.parse(fs.readFileSync(file, 'utf8'));
    console.log(`JSON OK: ${path.relative(repoRoot, file)}`);
  } catch (error) {
    failed = true;
    console.error(`Invalid JSON in ${path.relative(repoRoot, file)}: ${error.message}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log('Lint passed.');
