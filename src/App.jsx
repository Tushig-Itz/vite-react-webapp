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

  // Fetch all devices once on mount
  useEffect(() => {
    fetchDevices();
  }, []);

  // Filter devices locally when search term changes
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
    <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-blue-400" />
        <h3 className="font-semibold text-gray-200">{title}</h3>
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );

  const SpecRow = ({ label, value, unit = '' }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-700/50 last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="text-gray-200 font-medium">
        {value || value === 0 ? (
          <>
            {value}
            {unit && <span className="text-gray-400 ml-1">{unit}</span>}
          </>
        ) : (
          <span className="text-gray-500">N/A</span>
        )}
      </span>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-xl">Loading devices...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-400 mb-2">Error loading devices</p>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            FortiGate Specs Lookup
          </h1>
          <p className="text-gray-400">Quick reference for FortiGate firewall specifications</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by model (e.g., FG-100F, 70F, etc.)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
        </div>

        {/* Results List */}
        {filteredDevices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {filteredDevices.map((device) => (
              <button
                key={device.id}
                onClick={() => setSelectedDevice(device)}
                className={`p-5 rounded-xl border-2 text-left transition-all transform hover:scale-105 ${
                  selectedDevice?.id === device.id
                    ? 'bg-blue-900/30 border-blue-500 shadow-lg shadow-blue-500/20'
                    : 'bg-gray-800/50 backdrop-blur border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="font-bold text-xl text-white mb-2">{device.model}</div>
                <div className="text-gray-400 text-sm mb-3">{device.series || 'N/A'} Series</div>
                <div className="text-gray-300 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">IPS:</span>
                    <span className="font-medium">{device.ips_throughput_gbps || 'N/A'} Gbps</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">NGFW:</span>
                    <span className="font-medium">{device.ngfw_throughput_gbps || 'N/A'} Gbps</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700">
            <p className="text-gray-400">No devices found{searchTerm ? ` matching "${searchTerm}"` : ''}</p>
          </div>
        )}

        {/* Device Details */}
        {selectedDevice && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
              <h2 className="text-3xl font-bold text-white mb-2">{selectedDevice.model}</h2>
              <p className="text-gray-400">{selectedDevice.vendor} {selectedDevice.family} - {selectedDevice.series} Series</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <div className="bg-gray-800/50 backdrop-blur rounded-xl p-5 border border-gray-700">
                <h3 className="font-semibold text-gray-200 mb-3 flex items-center gap-2">
                  <Network className="w-4 h-4 text-blue-400" />
                  Interface Details
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">{selectedDevice.interface_raw}</p>
              </div>
            )}
          </div>
        )}

        {/* No selection prompt */}
        {!selectedDevice && filteredDevices.length > 0 && (
          <div className="text-center py-16 bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700">
            <Network className="w-20 h-20 text-gray-600 mx-auto mb-4 opacity-50" />
            <p className="text-gray-400 text-lg">Select a device above to view detailed specifications</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;