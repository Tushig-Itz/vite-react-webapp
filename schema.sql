PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Identity
    vendor TEXT NOT NULL,
    family TEXT NOT NULL,
    model TEXT NOT NULL,
    model_norm TEXT NOT NULL UNIQUE,
    series TEXT,

    -- Security throughput
    ips_throughput_gbps REAL,
    ngfw_throughput_gbps REAL,
    threat_protection_gbps REAL,

    -- Firewall throughput
    firewall_throughput_1518_gbps REAL,
    firewall_throughput_512_gbps  REAL,
    firewall_throughput_64_gbps   REAL,
    firewall_latency_us REAL,
    firewall_throughput_mpps REAL,

    -- Sessions
    concurrent_sessions INTEGER,
    new_sessions_per_sec INTEGER,

    -- VPN
    ipsec_vpn_throughput_gbps REAL,
    gateway_to_gateway_vpn INTEGER,
    client_to_gateway_tunnels INTEGER,

    -- SSL inspection
    ssl_inspection_throughput_gbps REAL,
    ssl_inspection_cps INTEGER,
    ssl_inspection_concurrent_sessions INTEGER,

    -- Virtual domains
    virtual_systems_default INTEGER,
    virtual_systems_max INTEGER,

    -- Interfaces
    wan_ports INTEGER,
    ge_rj45_ports INTEGER,
    fortilink_ports INTEGER,
    console_ports INTEGER,
    usb_ports INTEGER,
    interface_raw TEXT,

    -- Lifecycle
    release_year INTEGER,
    support_years INTEGER,
    datasheet_url TEXT,
    datasheet_date TEXT
);

CREATE INDEX IF NOT EXISTS idx_devices_model_norm ON devices(model_norm);
CREATE INDEX IF NOT EXISTS idx_devices_ips ON devices(ips_throughput_gbps);
CREATE INDEX IF NOT EXISTS idx_devices_threat ON devices(threa