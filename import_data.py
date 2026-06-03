import sqlite3
import csv
import re
import sys
import io

# Canonical columns with SQLite storage type ('real' -> REAL, 'int' -> INTEGER, 'text' -> TEXT).
# model_norm is computed separately.
COLUMN_TYPES = {
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
COLUMNS = list(COLUMN_TYPES.keys())
SQL_TYPE = {"real": "REAL", "int": "INTEGER", "text": "TEXT"}


def normalize_model(model):
    return re.sub(r"[^a-z0-9]", "", model.lower())


def cast_value(col, raw):
    """Cast a raw CSV string to the column's Python type, or None when blank."""
    if raw is None:
        return None
    s = raw.replace("\x00", "").strip()
    if s == "":
        return None
    t = COLUMN_TYPES[col]
    if t == "real":
        return float(s)
    if t == "int":
        f = float(s)
        if not f.is_integer():
            raise ValueError('Non-integer INT ' + col + '="' + s + '"')
        return int(f)
    return s


conn = sqlite3.connect("build.db")
cursor = conn.cursor()
cursor.execute("DROP TABLE IF EXISTS devices")

col_defs = ["id INTEGER PRIMARY KEY AUTOINCREMENT", "model_norm TEXT"]
col_defs += [c + " " + SQL_TYPE[COLUMN_TYPES[c]] for c in COLUMNS]
cursor.execute("CREATE TABLE devices (\n  " + ",\n  ".join(col_defs) + "\n)")
print("Created fresh devices table (typed columns)")

insert_cols = ["model_norm"] + COLUMNS
insert_sql = "INSERT INTO devices (" + ", ".join(insert_cols) + ") VALUES (" + ", ".join(["?"] * len(insert_cols)) + ")"

with open("fortigate_specs.csv", encoding="utf-8", errors="replace") as f:
    text = f.read().replace("\x00", "")
reader = csv.DictReader(io.StringIO(text))
missing = [c for c in COLUMNS if c not in reader.fieldnames]
if missing:
    print("WARNING: CSV missing columns (will be NULL):", missing)

inserted = 0
for row_num, row in enumerate(reader, start=2):
    model = (row.get("model") or "").strip()
    if not model:
        continue
    try:
        values = [normalize_model(model)] + [cast_value(c, row.get(c)) for c in COLUMNS]
    except ValueError as e:
        print("ERROR row", row_num, "(" + model + "):", e)
        sys.exit(1)
    cursor.execute(insert_sql, values)
    inserted += 1

conn.commit()
print("\n" + "=" * 60 + "\nImport complete! Total devices: " + str(inserted) + "\n" + "=" * 60 + "\n")

print("Sample data (note Python types):")
for r in cursor.execute("SELECT model, ips_throughput_gbps, concurrent_sessions FROM devices ORDER BY model LIMIT 5"):
    print("  " + r[0].ljust(14) + " IPS=" + repr(r[1]) + " (" + type(r[1]).__name__ + ")  sessions=" + repr(r[2]) + " (" + type(r[2]).__name__ + ")")

conn.close()
print("\nDatabase created: build.db")
