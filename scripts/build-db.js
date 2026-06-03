import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n🔨 Building database from CSV...\n');

// Canonical columns with SQLite storage type.
// 'real' -> REAL, 'int' -> INTEGER, 'text' -> TEXT. model_norm is computed separately.
const COLUMN_TYPES = {
  vendor: 'text', family: 'text', model: 'text', series: 'text',
  ips_throughput_gbps: 'real', ngfw_throughput_gbps: 'real', threat_protection_gbps: 'real',
  firewall_throughput_1518_gbps: 'real', firewall_throughput_512_gbps: 'real', firewall_throughput_64_gbps: 'real',
  firewall_latency_us: 'real', firewall_throughput_mpps: 'real',
  concurrent_sessions: 'int', new_sessions_per_sec: 'int',
  ipsec_vpn_throughput_gbps: 'real', gateway_to_gateway_vpn: 'int', client_to_gateway_tunnels: 'int',
  ssl_inspection_throughput_gbps: 'real', ssl_inspection_cps: 'int', ssl_inspection_concurrent_sessions: 'int',
  virtual_systems_default: 'int', virtual_systems_max: 'int',
  wan_ports: 'int', ge_rj45_ports: 'int', fortilink_ports: 'int', console_ports: 'int', usb_ports: 'int',
  interface_raw: 'text', release_year: 'int', support_years: 'int', datasheet_url: 'text', datasheet_date: 'text',
};
const COLUMNS = Object.keys(COLUMN_TYPES);
const SQL_TYPE = { real: 'REAL', int: 'INTEGER', text: 'TEXT' };

const publicDir = join(__dirname, '..', 'public');
try { mkdirSync(publicDir, { recursive: true }); console.log('✓ Public directory ready'); } catch (e) { /* exists */ }

const dbPath = join(publicDir, 'build.db');
console.log('📍 Database path:', dbPath);
const db = new Database(dbPath);

// Recreate table with proper column types
db.exec('DROP TABLE IF EXISTS devices');
const colDefs = ['id INTEGER PRIMARY KEY AUTOINCREMENT', 'model_norm TEXT']
  .concat(COLUMNS.map(c => `${c} ${SQL_TYPE[COLUMN_TYPES[c]]}`));
db.exec(`CREATE TABLE devices (\n  ${colDefs.join(',\n  ')}\n)`);
console.log('✓ Schema created (typed columns)');

function normalizeModel(model) { return model.toLowerCase().replace(/[^a-z0-9]/g, ''); }

// Cast a raw CSV string to the column's JS type, or null when blank.
function castValue(col, raw) {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).replace(/\x00/g, '').trim();
  if (s === '') return null;
  const t = COLUMN_TYPES[col];
  if (t === 'real') { const n = Number(s); if (Number.isNaN(n)) throw new Error(`Non-numeric REAL ${col}="${s}"`); return n; }
  if (t === 'int')  { const n = Number(s); if (!Number.isInteger(n)) throw new Error(`Non-integer INT ${col}="${s}"`); return n; }
  return s;
}

function parseCSV(text) {
  const lines = []; let current = ''; let inQuotes = false; let row = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i]; const next = text[i + 1];
    if (char === '"') { if (inQuotes && next === '"') { current += '"'; i++; } else { inQuotes = !inQuotes; } }
    else if (char === ',' && !inQuotes) { row.push(current); current = ''; }
    else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (current || row.length) { row.push(current); if (row.some(r => r.trim())) lines.push(row); row = []; current = ''; }
      if (char === '\r' && next === '\n') i++;
    } else { current += char; }
  }
  if (current || row.length) { row.push(current); if (row.some(r => r.trim())) lines.push(row); }
  return lines;
}

const csvPath = join(__dirname, '..', 'fortigate_specs.csv');
console.log('📄 Reading CSV:', csvPath);
let csvContent;
try { csvContent = readFileSync(csvPath, 'utf-8').replace(/\x00/g, ''); }
catch (err) { console.error('❌ fortigate_specs.csv not found!'); process.exit(1); }

const rows = parseCSV(csvContent);
const headers = rows[0].map(h => h.trim());
const idx = {}; headers.forEach((h, i) => { idx[h] = i; });
const missing = COLUMNS.filter(c => !(c in idx));
if (missing.length) console.warn('⚠️  CSV missing columns (will be NULL):', missing.join(', '));
console.log(`✓ Parsed ${rows.length - 1} data rows`);

const insertCols = ['model_norm', ...COLUMNS];
const insertStmt = db.prepare(
  `INSERT INTO devices (${insertCols.join(', ')}) VALUES (${insertCols.map(() => '?').join(', ')})`
);

const dataToInsert = [];
for (let i = 1; i < rows.length; i++) {
  const raw = rows[i];
  const get = (col) => (idx[col] === undefined ? '' : raw[idx[col]]);
  const model = String(get('model') || '').trim();
  if (!model) continue;
  try {
    dataToInsert.push([normalizeModel(model), ...COLUMNS.map(c => castValue(c, get(c)))]);
  } catch (e) {
    console.error(`❌ ${model}: ${e.message}`); process.exit(1);
  }
}

const insertMany = db.transaction((dr) => { for (const r of dr) insertStmt.run(r); });
console.log('💾 Inserting data...');
insertMany(dataToInsert);

const { count } = db.prepare('SELECT COUNT(*) as count FROM devices').get();
console.log(`✓ Inserted ${count} devices`);
console.log('\n📊 Sample:');
for (const s of db.prepare('SELECT model, series, ips_throughput_gbps FROM devices ORDER BY model LIMIT 5').all()) {
  console.log(`  ${s.model.padEnd(14)} (${s.series}) IPS ${s.ips_throughput_gbps} Gbps  [${typeof s.ips_throughput_gbps}]`);
}
db.close();
console.log('\n✅ Database built successfully!\n');
