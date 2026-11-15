import fs from 'fs';
import path from 'path';

const root = path.resolve('e:/game tong hop');
const seen = new Set();
const queue = [path.join(root, 'App.tsx')];
const notable = [];

function resolve(from, spec) {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(from), spec);
  for (const ext of ['.tsx', '.ts', '.js', '']) {
    const p = base + ext;
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  for (const ext of ['/index.tsx', '/index.ts']) {
    const p = base + ext;
    if (fs.existsSync(p)) return p;
  }
  return null;
}

while (queue.length) {
  const file = queue.pop();
  if (seen.has(file)) continue;
  seen.add(file);
  const rel = path.relative(root, file).replace(/\\/g, '/');
  if (/monsterArt|tracks\.ts|overworldBgm|audio\/|BattleScreen|FieldView|WorldContext/.test(rel)) {
    notable.push(rel);
  }
  let src;
  try {
    src = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const re = /from\s+['"](\.[^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src))) {
    const r = resolve(file, m[1]);
    if (r && r.startsWith(root) && !r.includes('node_modules')) queue.push(r);
  }
}

console.log('reachable', seen.size);
console.log(notable.sort().join('\n'));
