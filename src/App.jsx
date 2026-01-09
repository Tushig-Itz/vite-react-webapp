import { useState, useEffect } from 'react';
import { Download, Zap, Shield, Wifi, HardDrive, Users, Network } from 'lucide-react';
import { SearchBar } from './components/searchBar';
import { DeviceGrid } from './components/deviceGrid';
import { exportDeviceToExcel } from './utils/excelExport';
import { formatNumber } from './utils/formatters';
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

  const handleExport = async () => {
    try {
      await exportDeviceToExcel(selectedDevice, formatNumber);
    } catch (error) {
      alert(`Export failed: ${error.message}`);
    }
  };

  if (loading) return <div className="loading"><div className="spinner"></div><p>Loading devices...</p></div>;
  if (error) return <div className="loading"><p style={{ color: '#ef4444' }}>Error: {error}</p></div>;

  return (
    <div>
      <div className="header">
        <h1>FortiGate Specs Lookup</h1>
        <p>Quick reference for FortiGate firewall specifications</p>
      </div>

      <SearchBar value={searchTerm} onChange={setSearchTerm} />

      {filteredDevices.length > 0 ? (
        <DeviceGrid
          devices={filteredDevices}
          selectedDevice={selectedDevice}
          onSelectDevice={setSelectedDevice}
        />
      ) : (
        <div className="empty-state">
          <p>No devices found{searchTerm ? ` matching "${searchTerm}"` : ''}</p>
        </div>
      )}

      {selectedDevice && (
        <div className="spec-details fade-in">
          <div className="spec-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2>{selectedDevice.model}</h2>
                <p style={{ color: '#9ca3af' }}>
                  {selectedDevice.vendor} {selectedDevice.family} - {selectedDevice.series} Series
                </p>
              </div>
              <button
                onClick={handleExport}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 6px rgba(59, 130, 246, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 12px rgba(59, 130, 246, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.3)';
                }}
              >
                <Download size={18} />
                Export to Excel
              </button>
            </div>
          </div>

          <div className="spec-grid">
            <div className="spec-card">
              <div className="spec-card-header">
                <Zap size={20} />
                <h3>Firewall Performance</h3>
              </div>
              <div>
                <div className="spec-row">
                  <span className="spec-label">1518 byte packets</span>
                  <span className="spec-value">{selectedDevice.firewall_throughput_1518_gbps || 'N/A'} <span className="unit">Gbps</span></span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">512 byte packets</span>
                  <span className="spec-value">{selectedDevice.firewall_throughput_512_gbps || 'N/A'} <span className="unit">Gbps</span></span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">64 byte packets</span>
                  <span className="spec-value">{selectedDevice.firewall_throughput_64_gbps || 'N/A'} <span className="unit">Gbps</span></span>
                </div>
              </div>
            </div>
            <div className="spec-card">
              <div className="spec-card-header">
                <Shield size={20} />
                <h3>Security Performance</h3>
              </div>
              <div>
                <div className="spec-row">
                  <span className="spec-label">IPS Throughput</span>
                  <span className="spec-value">{selectedDevice.ips_throughput_gbps || 'N/A'} <span className="unit">Gbps</span></span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">NGFW Throughput</span>
                  <span className="spec-value">{selectedDevice.ngfw_throughput_gbps || 'N/A'} <span className="unit">Gbps</span></span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Threat Protection</span>
                  <span className="spec-value">{selectedDevice.threat_protection_gbps || 'N/A'} <span className="unit">Gbps</span></span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">AV Throughput</span>
                  <span className="spec-value">{selectedDevice.av_throughput_gbps || 'N/A'} <span className="unit">Gbps</span></span>
                </div>
              </div>
            </div>
            <div className="spec-card">
              <div className="spec-card-header">
                <Wifi size={20} />
                <h3>VPN Performance</h3>
              </div>
              <div>
                <div className="spec-row">
                  <span className="spec-label">IPsec VPN</span>
                  <span className="spec-value">{selectedDevice.ipsec_vpn_throughput_gbps || 'N/A'} <span className="unit">Gbps</span></span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Gateway-to-Gateway VPN</span>
                  <span className="spec-value">{formatNumber(selectedDevice.gateway_to_gateway_vpn)} <span className="unit">tunnels</span></span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">SSL VPN Users (Max)</span>
                  <span className="spec-value">{formatNumber(selectedDevice.ssl_vpn_users_max)} <span className="unit">users</span></span>
                </div>
              </div>
            </div>
            <div className="spec-card">
              <div className="spec-card-header">
                <HardDrive size={20} />
                <h3>Sessions & Capacity</h3>
              </div>
              <div>
                <div className="spec-row">
                  <span className="spec-label">Concurrent Sessions</span>
                  <span className="spec-value">{formatNumber(selectedDevice.concurrent_sessions)}</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">New Sessions/sec</span>
                  <span className="spec-value">{formatNumber(selectedDevice.new_sessions_per_sec)}</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Firewall Policies (Max)</span>
                  <span className="spec-value">{formatNumber(selectedDevice.firewall_policy_max)}</span>
                </div>
              </div>
            </div>
            <div className="spec-card">
              <div className="spec-card-header">
                <Users size={20} />
                <h3>Virtualization</h3>
              </div>
              <div>
                <div className="spec-row">
                  <span className="spec-label">Virtual Systems (Default)</span>
                  <span className="spec-value">{selectedDevice.virtual_systems_default || 'N/A'}</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Virtual Systems (Max)</span>
                  <span className="spec-value">{selectedDevice.virtual_systems_max || 'N/A'}</span>
                </div>
              </div>
            </div>
            <div className="spec-card">
              <div className="spec-card-header">
                <Network size={20} />
                <h3>Interfaces</h3>
              </div>
              <div>
                <div className="spec-row">
                  <span className="spec-label">GE RJ45 Ports</span>
                  <span className="spec-value">{selectedDevice.ge_rj45_ports || 'N/A'}</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">GE SFP Ports</span>
                  <span className="spec-value">{selectedDevice.ge_sfp_ports || 'N/A'}</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">10GE SFP+ Ports</span>
                  <span className="spec-value">{selectedDevice.ten_ge_sfp_ports || 'N/A'}</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">WAN Ports</span>
                  <span className="spec-value">{selectedDevice.wan_ports || 'N/A'}</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">DMZ Ports</span>
                  <span className="spec-value">{selectedDevice.dmz_ports || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
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

          {/* Product Information */}
          {(selectedDevice.release_year || selectedDevice.support_years || selectedDevice.datasheet_date || selectedDevice.datasheet_url) && (
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
    </div>
  );
}

export default App;