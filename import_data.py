import sqlite3
import csv
import re

def normalize_model(model):
    # Remove special characters and lowercase
    normalized = re.sub(r'[^a-z0-9]', '', model.lower())
    return normalized

conn = sqlite3.connect('public/build.db')
cursor = conn.cursor()

with open('fortigate_specs.sql', 'r') as f:
    reader = csv.reader(f)
    headers = next(reader) 
    
    for row in reader:
        if not row or not row[0]:
            continue
        
        # Value prep
        values = []
        for val in row:
            if val.strip() == '':
                values.append(None)
            else:
                values.append(val.strip())
        
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
            values[0],                    # vendor
            values[1],                    # family
            values[2],                    # model
            normalize_model(values[2]),   # model_norm
            values[3],                    # series
            values[4],                    # firewall_throughput_1518_gbps
            values[5],                    # firewall_throughput_512_gbps
            values[6],                    # firewall_throughput_64_gbps
            values[7],                    # ips_throughput_gbps
            values[8],                    # ngfw_throughput_gbps
            values[9],                    # threat_protection_gbps
            values[10],                   # av_throughput_gbps
            values[11],                   # ipsec_vpn_throughput_gbps
            values[12],                   # ssl_proxy_throughput_gbps
            values[13],                   # concurrent_sessions
            values[14],                   # new_sessions_per_sec
            values[15],                   # virtual_systems_default
            values[16],                   # virtual_systems_max
            values[17],                   # ssl_vpn_users_default
            values[18],                   # ssl_vpn_users_max
            values[19],                   # gateway_to_gateway_vpn
            values[20],                   # firewall_policy_max
            values[21],                   # ge_rj45_ports
            values[22],                   # ge_sfp_ports
            values[23],                   # ten_ge_sfp_ports
            values[24],                   # fortilink_ports
            values[25],                   # fortilink_slots
            values[26],                   # mgmt_ports
            values[27],                   # ha_ports
            values[28],                   # wan_ports
            values[29],                   # interface_raw
            values[30],                   # release_year
            values[31],                   # support_years
            values[32],                   # datasheet_url
            values[33],                   # datasheet_date
        ))
        
        print(f"Inserted: {values[2]}")

# how u forget these
conn.commit()
conn.close()

# test
print("\nImport complete!")
print("\nVerifying data:")
conn = sqlite3.connect('public/build.db')
cursor = conn.cursor()
cursor.execute("SELECT model, ips_throughput_gbps, ngfw_throughput_gbps FROM devices")
for row in cursor.fetchall():
    print(f"  {row[0]}: IPS={row[1]} Gbps, NGFW={row[2]} Gbps")
conn.close()