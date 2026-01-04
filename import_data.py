import sqlite3
import csv
import re

def normalize_model(model):
    """Convert model to searchable format"""
    normalized = re.sub(r'[^a-z0-9]', '', model.lower())
    return normalized

# Connect to database
conn = sqlite3.connect('public/build.db')
cursor = conn.cursor()

# CLEAR EXISTING DATA FIRST
cursor.execute("DELETE FROM devices")
print("Cleared existing data")

# Read CSV file
with open('fortigate_specs.sql', 'r') as f:
    reader = csv.reader(f)
    headers = next(reader)  # Skip header row
    
    for row in reader:
        if not row or not row[0]:
            continue
        
        values = []
        for val in row:
            if val.strip() == '':
                values.append(None)
            else:
                values.append(val.strip())
        
        model = values[2]
        model_norm = normalize_model(model)
        
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
                ge_rj45_ports, ge_sfp_ports, ten_ge_sfp_ports,
                fortilink_ports, fortilink_slots, mgmt_ports, ha_ports, wan_ports,
                interface_raw, release_year, support_years, datasheet_url, datasheet_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            values[0], values[1], model, model_norm, values[3],
            values[4], values[5], values[6], values[7], values[8],
            values[9], values[10], values[11], values[12], values[13],
            values[14], values[15], values[16], values[17], values[18],
            values[19], values[20], values[21], values[22], values[23],
            values[24], values[25], values[26], values[27], values[28],
            values[29], values[30], values[31], values[32], values[33]
        ))
        
        print(f"Inserted: {model} (searchable as: {model_norm})")

conn.commit()
conn.close()

print("\nImport complete!")
print("\nVerifying data:")
conn = sqlite3.connect('public/build.db')
cursor = conn.cursor()
cursor.execute("SELECT model, ips_throughput_gbps, ngfw_throughput_gbps FROM devices")
for row in cursor.fetchall():
    print(f"  {row[0]}: IPS={row[1]} Gbps, NGFW={row[2]} Gbps")
conn.close()