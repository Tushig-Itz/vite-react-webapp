import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n🔨 Building database from CSVs...\n');

// 'real' -> REAL, 'int' -> INTEGER, 'text' -> TEXT. Any column not listed defaults to TEXT.
const FIREWALL_TYPES = {
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

const SWITCH_TYPES = {
  vendor: 'text', family: 'text', model: 'text', series: 'text',
  mtbf_years: 'int', switching_capacity_gbps: 'real', packets_per_s_mpps: 'real',
  mac_add_storage: 'int', network_latency_us: 'real', vlans_support: 'int', lag_size: 'int',
  dram: 'text', flash_mem: 'text', storage_gb: 'int', acl: 'int', stp_instance: 'int',
  dimentions_h_d_w_mm: 'text', weight_kg: 'real', pwr_supply: 'text', pwr_required: 'text',
  pwr_consumed_avg_w: 'real', pwr_consumed_max_w: 'real', heat_diss_btuh: 'real',
  operating_temp: 'text', strg_temp: 'text', humidity: 'text', air_flw: 'text',
  noise_lvl_dba: 'real', certifications: 'text', poe_budget: 'int',
  mgmt_port: 'int', console_port: 'int', poe_ports: 'int', ge_ports: 'int', mugig_ports: 'int',
  sfp_ports: 'int', 'sfp+_ports': 'int', spf28_ports: 'int', 'qsfp+_ports': 'int', qsfp28_ports: 'int',
  interface_raw: 'text', release_year: 'int', support_years: 'int', datasheet_url: 'text', datasheet_date: 'text',
};

const AP_TYPES = {
  vendor: 'text', family: 'text', model: 'text', series: 'text',
  mtbf_years: 'int', standard: 'text', type: 'text', frequency_bands: 'text',
  no_of_radios: 'text', no_of_antennas: 'text', antenna_supported: 'text', antenna_type: 'text',
  'antenna_gain_2.4_dbi': 'real', antenna_gain_5_dbi: 'real', antenna_gain_6_dbi: 'real',
  'max_phy_band_2.4ghz_gbps': 'real', max_phy_band_5ghz_gbps: 'real', max_phy_band_6ghz_gbps: 'real',
  max_ssids: 'int', spatial_stream: 'text', client_cap_p_radio: 'int',
  security_auth: 'text', eap_types: 'text', advanced_features: 'text', wireless_monitoring: 'text',
  mount_opt: 'text', dimentions_h_d_w_mm: 'text', weight_kg: 'real', pwr_consumption_max_w: 'real',
  operating_temp: 'text', strg_temp: 'text', humidity: 'text', certifications: 'text', warranty: 'text',
  mgmt: 'text', usb_ports: 'int', console_port: 'int', poe: 'text', ge_ports: 'int', mugig_ports: 'int',
  interface_raw: 'text', release_year: 'int', support_years: 'int', datasheet_url: 'text', datasheet_date: 'text',
};

const PRODUCTS = [
  { table: 'devices', csv: 'fortigate_specs.csv', types: FIREWALL_TYPES },
  { table: 'switches', csv: 'fortiswitch_specs.csv', types: SWITCH_TYPES },
  { table: 'aps', csv: 'fortiap_specs.csv', types: AP_TYPES },
];

const SQL_TYPE = { real: 'REAL', int: 'INTEGER', text: 'TEXT' };
const q = (id) => '"' + String(id).replace(/"/g, '""') + '"'; // quote any identifier safely

function normalizeModel(model) { return String(model).toLowerCase().replace(/[^a-z0-9]/g, ''); }

function castValue(table, col, type, raw) {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).replace(/\x00/g, '').replace(/^﻿/, '').trim();
  if (s === '') return null;
  if (type === 'real') { const n = Number(s); if (Number.isNaN(n)) throw new Error(`${table}.${col}: non-numeric REAL "${s}"`); return n; }
  if (type === 'int')  { const n = Number(s); if (!Number.isInteger(n)) throw new Error(`${table}.${col}: non-integer INT "${s}"`); return n; }
  return s;
}

function parseCSV(text) {
  text = text.replace(/^﻿/, ''); // strip BOM
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

function buildTable(db, { table, csv, types }) {
  const columns = Object.keys(types);
  const csvPath = join(__dirname, '..', csv);
  let content;
  try { content = readFileSync(csvPath, 'utf-8').replace(/\x00/g, ''); }
  catch (err) { console.warn(`⚠️  ${csv} not found — skipping ${table}`); return; }

  db.exec(`DROP TABLE IF EXISTS ${q(table)}`);
  const colDefs = ['id INTEGER PRIMARY KEY AUTOINCREMENT', 'model_norm TEXT']
    .concat(columns.map(c => `${q(c)} ${SQL_TYPE[types[c]]}`));
  db.exec(`CREATE TABLE ${q(table)} (\n  ${colDefs.join(',\n  ')}\n)`);

  const rows = parseCSV(content);
  const headers = rows[0].map(h => h.replace(/^﻿/, '').trim());
  const idx = {}; headers.forEach((h, i) => { idx[h] = i; });
  const missing = columns.filter(c => !(c in idx));
  if (missing.length) console.warn(`  ⚠️  ${table}: CSV missing columns -> ${missing.join(', ')}`);

  const insertCols = ['model_norm', ...columns];
  const stmt = db.prepare(
    `INSERT INTO ${q(table)} (${insertCols.map(q).join(', ')}) VALUES (${insertCols.map(() => '?').join(', ')})`
  );

  const data = [];
  for (let i = 1; i < rows.length; i++) {
    const raw = rows[i];
    const get = (col) => (idx[col] === undefined ? '' : raw[idx[col]]);
    const model = String(get('model') || '').trim();
    if (!model) continue;
    try {
      data.push([normalizeModel(model), ...columns.map(c => castValue(table, c, types[c], get(c)))]);
    } catch (e) { console.error(`❌ ${model}: ${e.message}`); process.exit(1); }
  }
  const insertMany = db.transaction((d) => { for (const r of d) stmt.run(r); });
  insertMany(data);
  console.log(`✓ ${table}: inserted ${data.length} rows (${columns.length} cols)`);
}

const publicDir = join(__dirname, '..', 'public');
try { mkdirSync(publicDir, { recursive: true }); } catch (e) { /* exists */ }
const dbPath = join(publicDir, 'build.db');
const db = new Database(dbPath);
console.log('📍 Database path:', dbPath, '\n');

for (const product of PRODUCTS) buildTable(db, product);

db.close();
console.log('\n✅ Database built successfully!\n');
