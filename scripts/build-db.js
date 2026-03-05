import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n🔨 Building database from CSV...\n');

// Create public directory if it doesn't exist
const publicDir = join(__dirname, '..', 'public');
try {
  mkdirSync(publicDir, { recursive: true });
  console.log('✓ Public directory ready');
} catch (e) {
  // Already exists
}

const dbPath = join(publicDir, 'build.db');
console.log('📍 Database will be created at:', dbPath);

const db = new Database(dbPath);

console.log('📍 Database path:', dbPath);

// Create schema
db.exec(`
  CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor TEXT,
    family TEXT,
    model TEXT NOT NULL,
    model_norm TEXT,
    series TEXT,
    firewall_throughput_1518_gbps TEXT,
    firewall_throughput_512_gbps TEXT,
    firewall_throughput_64_gbps TEXT,
    ips_throughput_gbps TEXT,
    ngfw_throughput_gbps TEXT,
    threat_protection_gbps TEXT,
    av_throughput_gbps TEXT,
    ipsec_vpn_throughput_gbps TEXT,
    ssl_proxy_throughput_gbps TEXT,
    concurrent_sessions TEXT,
    new_sessions_per_sec TEXT,
    virtual_systems_default TEXT,
    virtual_systems_max TEXT,
    ssl_vpn_users_default TEXT,
    ssl_vpn_users_max TEXT,
    gateway_to_gateway_vpn TEXT,
    firewall_policy_max TEXT,
    ge_rj45_ports TEXT,
    ge_sfp_ports TEXT,
    sfp28_ports TEXT,
    qsfp28_ports TEXT,
    mgmt_ports TEXT,
    ha_ports TEXT,
    dmz_ports TEXT,
    wan_ports TEXT,
    interface_raw TEXT,
    release_year TEXT,
    support_years TEXT,
    datasheet_url TEXT,
    datasheet_date TEXT
  )
`);

console.log('✓ Schema created');


function normalizeModel(model) {
  return model.toLowerCase().replace(/[^a-z0-9]/g, '');
}


function parseCSV(text) {
  const lines = [];
  let current = '';
  let inQuotes = false;
  let row = [];
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    
    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(current.trim());
      current = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (current || row.length) {
        row.push(current.trim());
        if (row.some(r => r)) {
          lines.push(row);
        }
        row = [];
        current = '';
      }
      if (char === '\r' && next === '\n') i++; // skip \r\n
    } else {
      current += char;
    }
  }
  
  // Last row
  if (current || row.length) {
    row.push(current.trim());
    if (row.some(r => r)) {
      lines.push(row);
    }
  }
  
  return lines;
}

// Read CSV
const csvPath = join(__dirname, '..', 'fortigate_specs.csv');
console.log('📄 Reading CSV:', csvPath);

let csvContent;
try {
  csvContent = readFileSync(csvPath, 'utf-8');
} catch (err) {
  console.error('❌ Error: fortigate_specs.csv not found!');
  console.error('   Please create fortigate_specs.csv in your project root');
  process.exit(1);
}

const rows = parseCSV(csvContent);
const headers = rows[0];
console.log(`✓ Parsed ${rows.length - 1} rows`);


const insertStmt = db.prepare(`
  INSERT INTO devices (
    vendor, family, model, model_norm, series,
    firewall_throughput_1518_gbps, firewall_throughput_512_gbps, firewall_throughput_64_gbps,
    ips_throughput_gbps, ngfw_throughput_gbps, threat_protection_gbps, av_throughput_gbps,
    ipsec_vpn_throughput_gbps, ssl_proxy_throughput_gbps,
    concurrent_sessions, new_sessions_per_sec,
    virtual_systems_default, virtual_systems_max,
    ssl_vpn_users_default, ssl_vpn_users_max,
    gateway_to_gateway_vpn, firewall_policy_max,
    ge_rj45_ports, ge_sfp_ports, sfp28_ports, qsfp28_ports,
    mgmt_ports, ha_ports, dmz_ports, wan_ports,
    interface_raw, release_year, support_years, datasheet_url, datasheet_date
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Insert all rows
const insertMany = db.transaction((dataRows) => {
  for (const row of dataRows) {
    try {
      insertStmt.run(row);
    } catch (err) {
      console.error('❌ Error inserting row:', row[2], err.message);
    }
  }
});

const dataToInsert = [];
for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  if (!row[0] || !row[2]) continue; // Skip empty rows
  

  while (row.length < 34) {
    row.push('');
  }
  

  const values = row.map(v => v.trim() === '' ? null : v.trim());
  const model = values[2];
  const modelNorm = normalizeModel(model);
  
  dataToInsert.push([
    values[0], values[1], model, modelNorm, values[3],
    values[4], values[5], values[6], values[7], values[8],
    values[9], values[10], values[11], values[12], values[13],
    values[14], values[15], values[16], values[17], values[18],
    values[19], values[20], values[21], values[22], values[23],
    values[24], values[25], values[26], values[27], values[28],
    values[29], values[30], values[31], values[32], values[33]
  ]);
}

console.log('💾 Inserting data...');
insertMany(dataToInsert);

// Verify
const { count } = db.prepare('SELECT COUNT(*) as count FROM devices').get();
console.log(`✓ Inserted ${count} devices`);

// Show sample
console.log('\n📊 Sample data:');
const samples = db.prepare('SELECT model, series, ips_throughput_gbps, ngfw_throughput_gbps FROM devices ORDER BY model LIMIT 5').all();
samples.forEach(s => {
  console.log(`  ${s.model.padEnd(15)} (${s.series} Series) - IPS: ${(s.ips_throughput_gbps || 'N/A').padStart(6)} Gbps`);
});

db.close();

console.log('\n✅ Database built successfully!\n');
