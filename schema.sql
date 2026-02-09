PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Identity
    vendor TEXT NOT NULL,
    family TEXT NOT NULL,
    model TEXT NOT NULL,
    model_norm TEXT NOT NULL UNIQUE,
    series TEXT,  -- F / G (optional but handy)

    -- Firewall throughput
    firewall_throughput_1518_gbps REAL,
    firewall_throughput_512_gbps  REAL,
    firewall_throughput_64_gbps   REAL,
    ips_throughput_gbps REAL,
    ngfw_throughput_gbps REAL,
    threat_protection_gbps REAL,
    av_throughput_gbps REAL,
    ipsec_vpn_throughput_gbps REAL,
    ssl_proxy_throughput_gbps REAL,

    concurrent_sessions INTEGER,
    new_sessions_per_sec INTEGER,
    virtual_systems_default INTEGER,
    virtual_systems_max INTEGER,
    ssl_vpn_users_default INTEGER,
    ssl_vpn_users_max INTEGER,
    gateway_to_gateway_vpn INTEGER,
    firewall_policy_max INTEGER,

    -- Interfaces
    ge_rj45_ports INTEGER,
    ge_sfp_ports INTEGER,
    sfp28_ports INTEGER,
    qsfp28_ports INTEGER,
    mgmt_ports INTEGER,
    ha_ports INTEGER,
    wan_ports INTEGER,
    dmz_ports INTEGER,
    interface_raw TEXT,

    -- Lifecycle
    release_year INTEGER,
    support_years INTEGER,
    datasheet_url TEXT,
    datasheet_date TEXT
);

CREATE INDEX IF NOT EXISTS idx_devices_model_norm ON devices(model_norm);
CREATE INDEX IF NOT EXISTS idx_devices_ips ON devices(ips_throughput_gbps);
CREATE INDEX IF NOT EXISTS idx_devices_threat ON devices(threat_protection_gbps);
CREATE INDEX IF NOT EXISTS idx_devices_ngfw ON devices(ngfw_throughput_gbps);