// Verifies every lucide-react icon imported anywhere in src/ actually exists in
// the INSTALLED version. Marking lucide-react external in the esbuild check hides
// missing exports, and a missing icon renders as undefined -> blank page.
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const iconDir = join(root, 'node_modules/lucide-react/dist/esm/icons');
const kebab = (n) => n.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])(\d)/g, '$1-$2').toLowerCase();

const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : (/\.jsx?$/.test(f) ? [p] : []);
});

let bad = 0, seen = new Set();
for (const file of walk(join(root, 'src'))) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g)) {
    for (const raw of m[1].split(',')) {
      const name = raw.trim().split(/\s+as\s+/)[0].trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      const ok = ['.mjs', '.js'].some((e) => existsSync(join(iconDir, kebab(name) + e)));
      if (!ok) { console.error(`  MISSING  ${name}  (expected ${kebab(name)}.mjs)  <- ${file.replace(root + '/', '')}`); bad++; }
    }
  }
}
console.log(bad ? `\n${bad} missing icon(s)` : `all ${seen.size} lucide icons resolve`);
process.exit(bad ? 1 : 0);
