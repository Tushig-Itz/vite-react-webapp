import { useState, useEffect } from 'react';
import { Search, Network, Zap, Shield, Users, Wifi, HardDrive, Download } from 'lucide-react';
import './App.css';
import ExcelJS from 'exceljs';

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

  const exportToExcel = async (device) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(device.model);

  worksheet.columns = [
    { width: 35 },
    { width: 20 },
  ];

  const titleRow = worksheet.addRow(['FortiGate Specification Sheet']);
  titleRow.font = { size: 16, bold: true, color: { argb: 'FF2563EB' } };
  
  worksheet.mergeCells('A1:B1');
  
  worksheet.addRow([]);

  const addSection = (title, rows) => {
    const sectionRow = worksheet.addRow([title]);
    sectionRow.font = { size: 12, bold: true, color: { argb: 'FF3B82F6' } };
    sectionRow.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    }
    sectionRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' }
    };
    
    rows.forEach(([label, value, unit]) => {
      const row = worksheet.addRow([
        label, 
        value || value === 0 ? value : 'N/A', 
        unit || ''
      ]);
      row.font = { size: 11 };
      row.getCell(1).font = { size: 11, color: { argb: 'FF6B7280' } };
    });
    
    worksheet.addRow([]);
  };

  addSection('Model Information', [
    ['Family', device.family],
    ['Model', device.model],
  ]);
  addSection('Firewall Throughput', [
    ['1518 byte packets', device.firewall_throughput_1518_gbps ? `${device.firewall_throughput_1518_gbps} Gbps` : "N/A"],
    ['512 byte packets', device.firewall_throughput_512_gbps ? `${device.firewall_throughput_512_gbps} Gbps` : "N/A"],
    ['64 byte packets', device.firewall_throughput_64_gbps ? `${device.firewall_throughput_64_gbps} Gbps` : "N/A"]
  ]);
  addSection('Security Performance', [
    ['IPS Throughput', device.ips_throughput_gbps ? `${device.ips_throughput_gbps} Gbps` : "N/A"],
    ['NGFW Throughput', device.ngfw_throughput_gbps ? `${device.ngfw_throughput_gbps} Gbps` : "N/A"],
    ['Threat Protection', device.threat_protection_gbps ? `${device.threat_protection_gbps} Gbps` : "N/A"],
    ['AV Throughput', device.av_throughput_gbps ? `${device.av_throughput_gbps} Gbps` : "N/A"],
    ['SSL Proxy', device.ssl_proxy_throughput_gbps ? `${device.ssl_proxy_throughput_gbps} Gbps` : "N/A"]
  ]);
  addSection('VPN Performance', [
    ['IPsec VPN', device.ipsec_vpn_throughput_gbps ? `${device.ipsec_vpn_throughput_gbps} Gbps` : "N/A"],
    ['Gateway-to-Gateway VPN', device.gateway_to_gateway_vpn ? `${device.gateway_to_gateway_vpn} tunnels` : "N/A"],
    ['SSL VPN Users (Max)', device.ssl_vpn_users_max ? `${device.ssl_vpn_users_max} users` : "N/A"]
  ]);
  addSection('Sessions & Capacity', [
    ['Concurrent Sessions', formatNumber(device.concurrent_sessions)],
    ['New Sessions/sec', formatNumber(device.new_sessions_per_sec)],
    ['Firewall Policies (Max)', formatNumber(device.firewall_policy_max)]
  ]);
  addSection('Virtualization', [
    ['Virtual Systems (Default)', device.virtual_systems_default],
    ['Virtual Systems (Max)', device.virtual_systems_max]
  ]);
  addSection('Interfaces', [
    ['GE RJ45 Ports', device.ge_rj45_ports],
    ['GE SFP Ports', device.ge_sfp_ports],
    ['10GE SFP+ Ports', device.ten_ge_sfp_ports],
    ['FortiLink Ports', device.fortilink_ports],
    ['FortiLink Slots', device.fortilink_slots],
    ['Management Ports', device.mgmt_ports],
    ['WAN Ports', device.wan_ports],
    ['HA Ports', device.ha_ports]
  ]);
  if (device.interface_raw) {
    const detailsRow = worksheet.addRow(['Interface Details']);
    detailsRow.font = { size: 12, bold: true, color: { argb: 'FF3B82F6' } };
    detailsRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' }
    };
    
    const ifaceRow = worksheet.addRow([device.interface_raw]);
    worksheet.mergeCells(`A${ifaceRow.number}:C${ifaceRow.number}`);
    ifaceRow.font = { size: 11 };
    ifaceRow.alignment = { wrapText: true };
    
    worksheet.addRow([]);
  }
  if (device.release_year || device.support_years || device.datasheet_date || device.datasheet_url) {
    addSection('Product Information', [
      ['Release Year', device.release_year],
      ['Support Period', device.support_years ? `${device.support_years} years` : null],
      ['Datasheet Date', device.datasheet_date],
      ['Datasheet URL', HYPERLINK(device.datasheet_url)]
    ].filter(row => row[1]));
  }

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  const timestamp = new Date().toISOString().split('T')[0];
  link.download = `FortiGate_${device.model}_${timestamp}.xlsx`;
  
  link.click();
  window.URL.revokeObjectURL(url);
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
      {/* header */}
      <div className="header">
        <h1>FortiGate Specs Lookup</h1>
        <p>Quick reference for FortiGate firewall specifications</p>
      </div>

      {/* search */}
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

      {/* results */}
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

      {/* device details */}
      {selectedDevice && (
        <div className="spec-details fade-in">
          <div className="spec-header">
            <h2>{selectedDevice.model}</h2>
            <p style={{ color: '#9ca3af' }}>
              {selectedDevice.vendor} {selectedDevice.family} - {selectedDevice.series} Series
            </p>
          </div>
          <button
                onClick={() => exportToExcel(selectedDevice)}
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

          {/* Source & Metadata */}
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