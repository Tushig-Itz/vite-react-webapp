import sqlite3
import csv
import re

def normalize_model(model):
    """Convert model to searchable format"""
    normalized = re.sub(r'[^a-z0-9]', '', model.lower())
    return normalized

# Create fresh database
conn = sqlite3.connect('build.db')
cursor = conn.cursor()

# Drop and recreate table
cursor.execute("DROP TABLE IF EXISTS devices")

cursor.execute('''
    CREATE TABLE devices (
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
''')

print("Created fresh devices table")

# Import CSV
with open('fortigate_specs.sql', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    headers = next(reader)  # skip header
    print(f"CSV has {len(headers)} columns: {headers[:5]}...")
    
    for row_num, row in enumerate(reader, start=2):
        if not row or not row[0]:
            continue
        
        # Pad row to 34 columns if needed
        while len(row) < 34:
            row.append('')
        
        # Clean values - convert empty strings to None
        values = []
        for val in row:
            if val.strip() == '':
                values.append(None)
            else:
                values.append(val.strip())
        
        model = values[2]  # model is column 3 (0-indexed: 2)
        model_norm = normalize_model(model)
        
        try:
            cursor.execute('''
                INSERT INTO devices (
                    vendor, family, model, model_norm, series,
                    firewall_throughput_1518_gbps, firewall_throughput_512_gbps, firewall_throughput_64_gbps,
                    ips_throughput_gbps, ngfw_throughput_gbps, threat_protection_gbps, av_throughput_gbps,
                    ipsec_vpn_throughput_gbps, ssl_proxy_throughput_gbps,
                    concurrent_sessions, new_sessions_per_sec,
                    virtual_systems_default, virtual_systems_max,
                    ssl_vpn_users_default, ssl_vpn_users_max,
                    gateway_to_gateway_vpn, firewall_policy_max,
                    ge_rj45_ports, ge_sfp_ports, sfp28_ports,
                    qsfp28_ports, mgmt_ports, ha_ports, dmz_ports, wan_ports,
                    interface_raw, release_year, support_years, datasheet_url, datasheet_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                values[0],  # vendor
                values[1],  # family
                model,      # model
                model_norm, # model_norm (computed)
                values[3],  # series
                values[4],  # firewall_throughput_1518_gbps
                values[5],  # firewall_throughput_512_gbps
                values[6],  # firewall_throughput_64_gbps
                values[7],  # ips_throughput_gbps
                values[8],  # ngfw_throughput_gbps
                values[9],  # threat_protection_gbps
                values[10], # av_throughput_gbps
                values[11], # ipsec_vpn_throughput_gbps
                values[12], # ssl_proxy_throughput_gbps
                values[13], # concurrent_sessions
                values[14], # new_sessions_per_sec
                values[15], # virtual_systems_default
                values[16], # virtual_systems_max
                values[17], # ssl_vpn_users_default
                values[18], # ssl_vpn_users_max
                values[19], # gateway_to_gateway_vpn
                values[20], # firewall_policy_max
                values[21], # ge_rj45_ports
                values[22], # ge_sfp_ports
                values[23], # sfp28_ports
                values[24], # qsfp28_ports
                values[25], # mgmt_ports
                values[26], # ha_ports
                values[27], # dmz_ports
                values[28], # wan_ports
                values[29], # interface_raw
                values[30], # release_year
                values[31], # support_years
                values[32], # datasheet_url
                values[33]  # datasheet_date
            ))
            
            print(f"✓ Inserted: {model} (searchable as: {model_norm})")
        except Exception as e:
            print(f"✗ ERROR on row {row_num} (model: {model}): {e}")
            print(f"  Row has {len(row)} values")

conn.commit()

# Verify
cursor.execute("SELECT COUNT(*) FROM devices")
total = cursor.fetchone()[0]
print(f"\n{'='*60}")
print(f"Import complete! Total devices: {total}")
print(f"{'='*60}\n")

# Show sample
print("Sample data:")
cursor.execute("SELECT model, series, ips_throughput_gbps, ngfw_throughput_gbps FROM devices ORDER BY model LIMIT 10")
for row in cursor.fetchall():
    print(f"  {row[0]:15} ({row[1]} Series) - IPS: {row[2] or 'N/A':>6} Gbps, NGFW: {row[3] or 'N/A':>6} Gbps")

conn.close()
print("\nDatabase created: build.db")
