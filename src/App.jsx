import { useState, useEffect } from 'react';
import { Download, Zap, Shield, Wifi, HardDrive, Users, Network, FileText, GitCompare } from 'lucide-react';
import { SearchBar } from './components/searchBar';
import { DeviceGrid } from './components/deviceGrid';
import { RfpModal } from './components/rfpModal.jsx';
import { MultiModelModal } from './components/multiModelModal.jsx';
import { exportSingleWithRFP, exportMultipleModels, exportRfpMatch } from './utils/excelExport';
import { formatNumber } from './utils/formatters';
import './App.css';

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [devices, setDevices] = useState([]);
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRfpModal, setShowRfpModal] = useState(false);
  const [showMultiModal, setShowMultiModal] = useState(false);
  const [rfpRequirements, setRfpRequirements] = useState({});
  const [rfpFilterActive, setRfpFilterActive] = useState(false);

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    let filtered = devices;

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(device =>
        device.model.toLowerCase().includes(term) ||
        device.model_norm.toLowerCase().includes(term) ||
        (device.series && device.series.toLowerCase().includes(term))
      );
    }

    // Apply RFP filter if active
    if (rfpFilterActive && Object.keys(rfpRequirements).length > 0) {
      filtered = filterByRfpRequirements(filtered, rfpRequirements);
    }

    setFilteredDevices(filtered);
  }, [searchTerm, devices, rfpFilterActive, rfpRequirements]);

  // Filter devices that meet RFP requirements (no spec worse than required)
  const filterByRfpRequirements = (deviceList, requirements) => {
    const specs = [
      'firewall_throughput_1518_gbps',
      'ngfw_throughput_gbps',
      'threat_protection_gbps',
      'concurrent_sessions',
      'new_sessions_per_sec',
      'ips_throughput_gbps',
      'av_throughput_gbps',
      'ipsec_vpn_throughput_gbps',
      'ssl_proxy_throughput_gbps',
      'virtual_systems_max',
      'ssl_vpn_users_max',
      'gateway_to_gateway_vpn',
      'firewall_policy_max'
    ];

    return deviceList.filter(device => {
      // Device must meet or exceed ALL non-empty requirements
      return specs.every(spec => {
        const reqValue = requirements[spec];
        if (!reqValue || reqValue === '') return true; // Skip empty requirements

        const deviceValue = device[spec];
        if (!deviceValue) return false; // Device missing this spec

        // Extract numeric value (handle formats like "20/18/10 Gbps" -> take first number)
        const parseValue = (val) => {
          if (typeof val === 'number') return val;
          const str = String(val).trim();
          const match = str.match(/^(\d+\.?\d*)/);
          return match ? parseFloat(match[1]) : 0;
        };

        const reqNum = parseValue(reqValue);
        const deviceNum = parseValue(deviceValue);

        // Device value must be >= requirement
        return deviceNum >= reqNum;
      });
    }).sort((a, b) => {
      // Sort by total "excess" capacity (how much better than requirements)
      let scoreA = 0;
      let scoreB = 0;

      specs.forEach(spec => {
        const reqValue = requirements[spec];
        if (!reqValue || reqValue === '') return;

        const parseValue = (val) => {
          if (typeof val === 'number') return val;
          const str = String(val).trim();
          const match = str.match(/^(\d+\.?\d*)/);
          return match ? parseFloat(match[1]) : 0;
        };

        const reqNum = parseValue(reqValue);
        const valA = parseValue(a[spec] || 0);
        const valB = parseValue(b[spec] || 0);

        // Add percentage over requirement
        if (reqNum > 0) {
          scoreA += (valA / reqNum);
          scoreB += (valB / reqNum);
        }
      });

      return scoreB - scoreA; // Higher score first (best match)
    });
  };

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

  const handleExportSingle = async () => {
    try {
      await exportSingleWithRFP(selectedDevice, formatNumber, rfpRequirements);
    } catch (error) {
      alert(`Export failed: ${error.message}`);
    }
  };

  const handleExportMultiple = async (selectedModels) => {
    try {
      await exportMultipleModels(selectedModels, formatNumber);
    } catch (error) {
      alert(`Export failed: ${error.message}`);
    }
  };

  const handleSaveRfp = (requirements) => {
    setRfpRequirements(requirements);
    const hasRequirements = Object.values(requirements).some(val => val !== '');
    setRfpFilterActive(hasRequirements);
  };

  const handleToggleRfpFilter = () => {
    setRfpFilterActive(!rfpFilterActive);
  };

  const handleClearRfp = () => {
    setRfpRequirements({});
    setRfpFilterActive(false);
  };

  // Check if any RFP requirements are set
  const hasRfpRequirements = Object.values(rfpRequirements).some(val => val !== '');

  if (loading) return <div className="loading"><div className="spinner"></div><p>Loading devices...</p></div>;
  if (error) return <div className="loading"><p style={{ color: '#ef4444' }}>Error: {error}</p></div>;

  return (
    <div>
      <div className="header">
        <div>
          <h1>FortiGate Specs Lookup</h1>
          <p>Quick reference for FortiGate firewall specifications</p>
        </div>
        <div className="header-buttons">
          <button
            onClick={() => setShowRfpModal(true)}
            className="rfp-button"
          >
            <FileText size={18} />
            {hasRfpRequirements ? 'Edit RFP' : 'Create RFP'}
            {hasRfpRequirements && <span className="rfp-badge">✓</span>}
          </button>
          <button
            onClick={() => setShowMultiModal(true)}
            className="compare-button"
          >
            <GitCompare size={18} />
            Compare Models
          </button>
        </div>
      </div>

      <SearchBar value={searchTerm} onChange={setSearchTerm} />

      {/* RFP Filter Status */}
      {hasRfpRequirements && (
        <div style={{ 
          marginBottom: '1.5rem', 
          padding: '1rem', 
          background: rfpFilterActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)', 
          border: `1px solid ${rfpFilterActive ? '#10b981' : '#6b7280'}`, 
          borderRadius: '0.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <p style={{ fontWeight: '500', color: '#e5e7eb', marginBottom: '0.25rem' }}>
              RFP Filter: {rfpFilterActive ? 'Active' : 'Inactive'}
            </p>
            <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
              {rfpFilterActive 
                ? `Showing ${filteredDevices.length} device(s) that meet all requirements` 
                : 'Click "Activate Filter" to show only matching devices'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={handleToggleRfpFilter}
              className={rfpFilterActive ? 'btn-secondary' : 'btn-primary'}
              style={{ fontSize: '0.875rem' }}
            >
              {rfpFilterActive ? 'Deactivate Filter' : 'Activate Filter'}
            </button>
            <button
              onClick={handleClearRfp}
              className="btn-secondary"
              style={{ fontSize: '0.875rem' }}
            >
              Clear RFP
            </button>
          </div>
        </div>
      )}

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
                onClick={() => {
                  if (rfpFilterActive && hasRfpRequirements) {
                    exportRfpMatch(selectedDevice, formatNumber, rfpRequirements);
                  } else {
                    handleExportSingle();
                  }
                }}
                className="export-button"
              >
                <Download size={18} />
                {rfpFilterActive && hasRfpRequirements ? 'Export RFP Match' : 'Export to Excel'}
              </button>
            </div>
          </div>

          <div className="spec-grid">
            <div className="spec-card">
              <div className="spec-card-header">
                <Zap size={20} />
                <h3>Firewall Throughput</h3>
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
                  <span className="spec-label">GE SFP+ Ports</span>
                  <span className="spec-value">{selectedDevice.ge_sfp_ports || 'N/A'}</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">SFP 28 Ports</span>
                  <span className="spec-value">{selectedDevice.sfp28_ports || 'N/A'}</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">QSFP 28 Ports</span>
                  <span className="spec-value">{selectedDevice.qsfp28_ports || 'N/A'}</span>
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
        </div>
      )}

      <RfpModal
        isOpen={showRfpModal}
        onClose={() => setShowRfpModal(false)}
        onSave={handleSaveRfp}
        initialData={rfpRequirements}
      />

      <MultiModelModal
        isOpen={showMultiModal}
        onClose={() => setShowMultiModal(false)}
        devices={devices}
        onExport={handleExportMultiple}
      />
    </div>
  );
}

export default App;