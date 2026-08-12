import sqlite3
import csv
import re
import sys
import io
import os

# 'real' -> REAL, 'int' -> INTEGER, 'text' -> TEXT. Unlisted columns default to TEXT.
FIREWALL_TYPES = {
    "vendor": "text", "family": "text", "model": "text", "series": "text",
    "ips_throughput_gbps": "real", "ngfw_throughput_gbps": "real", "threat_protection_gbps": "real",
    "firewall_throughput_1518_gbps": "real", "firewall_throughput_512_gbps": "real", "firewall_throughput_64_gbps": "real",
    "firewall_latency_us": "real", "firewall_throughput_mpps": "real",
    "concurrent_sessions": "int", "new_sessions_per_sec": "int",
    "ipsec_vpn_throughput_gbps": "real", "gateway_to_gateway_vpn": "int", "client_to_gateway_tunnels": "int",
    "ssl_inspection_throughput_gbps": "real", "ssl_inspection_cps": "int", "ssl_inspection_concurrent_sessions": "int",
    "virtual_systems_default": "int", "virtual_systems_max": "int",
    "wan_ports": "int", "ge_rj45_ports": "int", "fortilink_ports": "int", "console_ports": "int", "usb_ports": "int",
    "interface_raw": "text", "release_year": "int", "support_years": "int", "datasheet_url": "text", "datasheet_date": "text",
}

SWITCH_TYPES = {
    "vendor": "text", "family": "text", "model": "text", "series": "text",
    "mtbf_years": "int", "switching_capacity_gbps": "real", "packets_per_s_mpps": "real",
    "mac_add_storage": "int", "network_latency_us": "real", "vlans_support": "int", "lag_size": "int",
    "dram": "text", "flash_mem": "text", "storage_gb": "int", "acl": "int", "stp_instance": "int",
    "dimentions_h_d_w_mm": "text", "weight_kg": "real", "pwr_supply": "text", "pwr_required": "text",
    "pwr_consumed_avg_w": "real", "pwr_consumed_max_w": "real", "heat_diss_btuh": "real",
    "operating_temp": "text", "strg_temp": "text", "humidity": "text", "air_flw": "text",
    "noise_lvl_dba": "real", "certifications": "text", "poe_budget": "int",
    "mgmt_port": "int", "console_port": "int", "poe_ports": "int", "ge_ports": "int", "mugig_ports": "int",
    "sfp_ports": "int", "sfp+_ports": "int", "spf28_ports": "int", "qsfp+_ports": "int", "qsfp28_ports": "int",
    "interface_raw": "text", "release_year": "int", "support_years": "int", "datasheet_url": "text", "datasheet_date": "text",
}

AP_TYPES = {
    "vendor": "text", "family": "text", "model": "text", "series": "text",
    "mtbf_years": "int", "standard": "text", "type": "text", "frequency_bands": "text",
    "no_of_radios": "text", "no_of_antennas": "text", "antenna_supported": "text", "antenna_type": "text",
    "antenna_gain_2.4_dbi": "real", "antenna_gain_5_dbi": "real", "antenna_gain_6_dbi": "real",
    "max_phy_band_2.4ghz_gbps": "real", "max_phy_band_5ghz_gbps": "real", "max_phy_band_6ghz_gbps": "real",
    "max_ssids": "int", "spatial_stream": "text", "client_cap_p_radio": "int",
    "security_auth": "text", "eap_types": "text", "advanced_features": "text", "wireless_monitoring": "text",
    "mount_opt": "text", "dimentions_h_d_w_mm": "text", "weight_kg": "real", "pwr_consumption_max_w": "real",
    "operating_temp": "text", "strg_temp": "text", "humidity": "text", "certifications": "text", "warranty": "text",
    "mgmt": "text", "usb_ports": "int", "console_port": "int", "poe": "text", "ge_ports": "int", "mugig_ports": "int",
    "interface_raw": "text", "release_year": "int", "support_years": "int", "datasheet_url": "text", "datasheet_date": "text",
}

PRODUCTS = [
    ("devices", "fortigate_specs.csv", FIREWALL_TYPES),
    ("switches", "fortiswitch_specs.csv", SWITCH_TYPES),
    ("aps", "fortiap_specs.csv", AP_TYPES),
]

SQL_TYPE = {"real": "REAL", "int": "INTEGER", "text": "TEXT"}


def q(ident):
    return '"' + str(ident).replace('"', '""') + '"'


def normalize_model(model):
    return re.sub(r"[^a-z0-9]", "", str(model).lower())


def cast_value(table, col, typ, raw):
    if raw is None:
        return None
    s = raw.replace("\x00", "").lstrip("﻿").strip()
    if s == "":
        return None
    if typ == "real":
        return float(s)
    if typ == "int":
        f = float(s)
        if not f.is_integer():
            raise ValueError(table + "." + col + ': non-integer INT "' + s + '"')
        return int(f)
    return s


def build_table(conn, table, csv_file, types):
    columns = list(types.keys())
    if not os.path.exists(csv_file):
        print("WARNING: " + csv_file + " not found - skipping " + table)
        return
    cur = conn.cursor()
    cur.execute("DROP TABLE IF EXISTS " + q(table))
    col_defs = ["id INTEGER PRIMARY KEY AUTOINCREMENT", "model_norm TEXT"]
    col_defs += [q(c) + " " + SQL_TYPE[types[c]] for c in columns]
    cur.execute("CREATE TABLE " + q(table) + " (\n  " + ",\n  ".join(col_defs) + "\n)")

    insert_cols = ["model_norm"] + columns
    insert_sql = ("INSERT INTO " + q(table) + " (" + ", ".join(q(c) for c in insert_cols) +
                  ") VALUES (" + ", ".join(["?"] * len(insert_cols)) + ")")

    with open(csv_file, encoding="utf-8-sig", errors="replace") as f:
        text = f.read().replace("\x00", "")
    reader = csv.DictReader(io.StringIO(text))
    missing = [c for c in columns if c not in reader.fieldnames]
    if missing:
        print("  WARNING: " + table + " CSV missing columns: " + str(missing))

    inserted = 0
    for row_num, row in enumerate(reader, start=2):
        model = (row.get("model") or "").strip()
        if not model:
            continue
        try:
            values = [normalize_model(model)] + [cast_value(table, c, types[c], row.get(c)) for c in columns]
        except ValueError as e:
            print("ERROR row", row_num, "(" + model + "):", e)
            sys.exit(1)
        cur.execute(insert_sql, values)
        inserted += 1
    conn.commit()
    print("OK " + table + ": inserted " + str(inserted) + " rows (" + str(len(columns)) + " cols)")


conn = sqlite3.connect("build.db")
for table, csv_file, types in PRODUCTS:
    build_table(conn, table, csv_file, types)
conn.close()
print("\nDatabase created: build.db")
