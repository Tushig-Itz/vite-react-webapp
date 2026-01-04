import { useState, useEffect } from 'react';
import { Search, Network, Zap, Shield, Users, Wifi, HardDrive } from 'lucide-react';
import './App.css';

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [devices, setDevices] = useState([]);
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredDevices(devices);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = devices.filter(device => 
        device.model.toLowerCase().includes(term) ||
        device.model_norm.toLowerCase().includes(term) ||
        (device.series && device.series.toLowerCase().includes(term))
      );
      setFilteredDevices(filtered);
    }
  }, [searchTerm, devices]);

  const fetchDevices = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/devices');
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      setDevices(data.devices || []);
      setFilteredDevices(data.devices || []);
    } catch (err) {
      console.error('Failed to fetch devices:', err);
      setError(err.message);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return 'N/A';
    return num.toLocaleString();
  };

  const SpecCard = ({ icon: Icon, title, children }) => (
    <div className="spec-card">
      <div className="spec-card-header">
        <Icon size={20} />
        <h3>{title}</h3>
      </div>
      <div>
        {children}
      </div>
    </div>
  );

  const SpecRow = ({ label, value, unit = '' }) => (
    <div className="spec-row">
      <span className="spec-label">{label}</span>
      <span className="spec-value">
        {value || value === 0 ? (
          <>
            {value}
            {unit && <span className="unit">{unit}</span>}
          </>
        ) : (
          <span style={{ color: '#6b7280' }}>N/A</span>
        )}
      </span>
    </div>
  );

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading devices...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading">
        <p style={{ color: '#ef4444', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Error loading devices</p>
        <p style={{ color: '#9ca3af' }}>{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="header">
        <h1>FortiGate Specs Lookup</h1>
        <p>Quick reference for FortiGate firewall specifications</p>
      </div>

      {/* Search Bar */}
      <div className="search-container">
        <Search className="search-icon" size={20} />
        <input
          type="text"
          placeholder="Search by model (e.g., FG-100F, 70F, etc.)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Results List */}
      {filteredDevices.length > 0 ? (
        <div className="device-grid">
          {filteredDevices.map((device) => (
            <button
              key={device.id}
              onClick={() => setSelectedDevice(device)}
              className={`device-card ${selectedDevice?.id === device.id ? 'selected' : ''}`}
            >
              <h3>{device.model}</h3>
              <div className="series">{device.series || 'N/A'} Series</div>
              <div className="specs">
                <div className="spec-line">
                  <span style={{ color: '#9ca3af' }}>IPS:</span>
                  <span>{device.ips_throughput_gbps || 'N/A'} Gbps</span>
                </div>
                <div className="spec-line">
                  <span style={{ color: '#9ca3af' }}>NGFW:</span>
                  <span>{device.ngfw_throughput_gbps || 'N/A'} Gbps</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No devices found{searchTerm ? ` matching "${searchTerm}"` : ''}</p>
        </div>
      )}

      {/* Device Details */}
      {selectedDevice && (
        <div className="spec-details fade-in">
          <div className="spec-header">
            <h2>{selectedDevice.model}</h2>
            <p style={{ color: '#9ca3af' }}>
              {selectedDevice.vendor} {selectedDevice.family} - {selectedDevice.series} Series
            </p>
          </div>

          <div className="spec-grid">
            {/* Firewall Throughput */}
            <SpecCard icon={Zap} title="Firewall Throughput">
              <SpecRow label="1518 byte packets" value={selectedDevice.firewall_throughput_1518_gbps} unit="Gbps" />
              <SpecRow label="512 byte packets" value={selectedDevice.firewall_throughput_512_gbps} unit="Gbps" />
              <SpecRow label="64 byte packets" value={selectedDevice.firewall_throughput_64_gbps} unit="Gbps" />
            </SpecCard>

            {/* Security Performance */}
            <SpecCard icon={Shield} title="Security Performance">
              <SpecRow label="IPS Throughput" value={selectedDevice.ips_throughput_gbps} unit="Gbps" />
              <SpecRow label="NGFW Throughput" value={selectedDevice.ngfw_throughput_gbps} unit="Gbps" />
              <SpecRow label="Threat Protection" value={selectedDevice.threat_protection_gbps} unit="Gbps" />
              <SpecRow label="AV Throughput" value={selectedDevice.av_throughput_gbps} unit="Gbps" />
              <SpecRow label="SSL Proxy" value={selectedDevice.ssl_proxy_throughput_gbps} unit="Gbps" />
            </SpecCard>

            {/* VPN Performance */}
            <SpecCard icon={Wifi} title="VPN Performance">
              <SpecRow label="IPsec VPN" value={selectedDevice.ipsec_vpn_throughput_gbps} unit="Gbps" />
              <SpecRow label="Gateway-to-Gateway VPN" value={formatNumber(selectedDevice.gateway_to_gateway_vpn)} unit="tunnels" />
              <SpecRow label="SSL VPN Users (Max)" value={formatNumber(selectedDevice.ssl_vpn_users_max)} unit="users" />
            </SpecCard>

            {/* Sessions & Capacity */}
            <SpecCard icon={HardDrive} title="Sessions & Capacity">
              <SpecRow label="Concurrent Sessions" value={formatNumber(selectedDevice.concurrent_sessions)} />
              <SpecRow label="New Sessions/sec" value={formatNumber(selectedDevice.new_sessions_per_sec)} />
              <SpecRow label="Firewall Policies (Max)" value={formatNumber(selectedDevice.firewall_policy_max)} />
            </SpecCard>

            {/* Virtualization */}
            <SpecCard icon={Users} title="Virtualization">
              <SpecRow label="Virtual Systems (Default)" value={selectedDevice.virtual_systems_default} />
              <SpecRow label="Virtual Systems (Max)" value={selectedDevice.virtual_systems_max} />
            </SpecCard>

            {/* Interfaces */}
            <SpecCard icon={Network} title="Interfaces">
              <SpecRow label="GE RJ45 Ports" value={selectedDevice.ge_rj45_ports} />
              <SpecRow label="GE SFP Ports" value={selectedDevice.ge_sfp_ports} />
              <SpecRow label="10GE SFP+ Ports" value={selectedDevice.ten_ge_sfp_ports} />
              <SpecRow label="FortiLink Ports" value={selectedDevice.fortilink_ports} />
              <SpecRow label="FortiLink Slots" value={selectedDevice.fortilink_slots} />
              <SpecRow label="Management Ports" value={selectedDevice.mgmt_ports} />
              <SpecRow label="WAN Ports" value={selectedDevice.wan_ports} />
              <SpecRow label="HA Ports" value={selectedDevice.ha_ports} />
            </SpecCard>
          </div>

          {/* Interface Details */}
          {selectedDevice.interface_raw && (
            <div className="spec-card" style={{ marginTop: '1.5rem' }}>
              <div className="spec-card-header">
                <Network size={16} />
                <h3>Interface Details</h3>
              </div>
              <p style={{ color: '#9ca3af', fontSize: '0.875rem', lineHeight: '1.6' }}>
                {selectedDevice.interface_raw}
              </p>
            </div>
          )}

          {/* Source & Metadata - NEW SECTION */}
          {(selectedDevice.release_year || selectedDevice.support_years || selectedDevice.datasheet_url || selectedDevice.datasheet_date) && (
            <div className="spec-card" style={{ marginTop: '1.5rem' }}>
              <div className="spec-card-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <h3>Product Information</h3>
              </div>
              <div>
                {selectedDevice.release_year && (
                  <div className="spec-row">
                    <span className="spec-label">Release Year</span>
                    <span className="spec-value">{selectedDevice.release_year}</span>
                  </div>
                )}
                {selectedDevice.support_years && (
                  <div className="spec-row">
                    <span className="spec-label">Support Period</span>
                    <span className="spec-value">{selectedDevice.support_years} <span className="unit">years</span></span>
                  </div>
                )}
                {selectedDevice.datasheet_date && (
                  <div className="spec-row">
                    <span className="spec-label">Datasheet Date</span>
                    <span className="spec-value">{selectedDevice.datasheet_date}</span>
                  </div>
                )}
                {selectedDevice.datasheet_url && (
                  <div className="spec-row">
                    <span className="spec-label">Datasheet</span>
                    <span className="spec-value">
                      <a 
                        href={selectedDevice.datasheet_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: '#60a5fa', textDecoration: 'none' }}
                        onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                        onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                      >
                        View PDF
                      </a>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No selection prompt */}
      {!selectedDevice && filteredDevices.length > 0 && (
        <div className="empty-state">
          <Network size={80} />
          <p>Select a device above to view detailed specifications</p>
        </div>
      )}
    </div>
  );
}

export default App;