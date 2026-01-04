import { useState, useEffect } from 'react';
import { Search, Network, Zap, Shield, Users, Wifi, HardDrive } from 'lucide-react';
import './App.css';

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async (search = '') => {
    setLoading(true);
    setError(null);
    try {
      const url = search 
        ? `/api/devices?search=${encodeURIComponent(search)}`
        : '/api/devices';
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      setDevices(data.devices || []);
    } catch (err) {
      console.error('Failed to fetch devices:', err);
      setError(err.message);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    if (value.trim()) {
      fetchDevices(value);
    } else {
      fetchDevices();
    }
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return 'N/A';
    return num.toLocaleString();
  };

  const SpecCard = ({ icon: Icon, title, children }) => (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-5 h-5 text-blue-400" />
        <h3 className="font-semibold text-gray-200">{title}</h3>
      </div>
      {children}
    </div>
  );

  const SpecRow = ({ label, value, unit = '' }) => (
    <div className="flex justify-between py-2 border-b border-gray-700 last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="text-gray-200 font-medium">
        {value || value === 0 ? `${value} ${unit}`.trim() : 'N/A'}
      </span>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-xl">Loading devices...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-400 mb-2">Error loading devices</p>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">FortiGate Specs Lookup</h1>
          <p className="text-gray-400">Quick reference for FortiGate firewall specifications</p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by model (e.g., FG-100F, 200F, etc.)"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {devices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {devices.map((device) => (
              <button
                key={device.id}
                onClick={() => setSelectedDevice(device)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedDevice?.id === device.id
                    ? 'bg-blue-900 border-blue-500'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="font-bold text-xl text-white mb-1">{device.model}</div>
                <div className="text-gray-400 text-sm mb-2">{device.series || 'N/A'} Series</div>
                <div className="text-gray-300 text-sm">
                  <div>IPS: {device.ips_throughput_gbps || 'N/A'} Gbps</div>
                  <div>NGFW: {device.ngfw_throughput_gbps || 'N/A'} Gbps</div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
            <p className="text-gray-400">No devices found{searchTerm ? ` matching "${searchTerm}"` : ''}</p>
          </div>
        )}

        {selectedDevice && (
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-4">{selectedDevice.model} Specifications</h2>
              <div className="text-gray-400">{selectedDevice.vendor} {selectedDevice.family} - {selectedDevice.series} Series</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SpecCard icon={Zap} title="Firewall Throughput">
                <SpecRow label="1518 byte packets" value={selectedDevice.firewall_throughput_1518_gbps} unit="Gbps" />
                <SpecRow label="512 byte packets" value={selectedDevice.firewall_throughput_512_gbps} unit="Gbps" />
                <SpecRow label="64 byte packets" value={selectedDevice.firewall_throughput_64_gbps} unit="Gbps" />
              </SpecCard>

              <SpecCard icon={Shield} title="Security Performance">
                <SpecRow label="IPS Throughput" value={selectedDevice.ips_throughput_gbps} unit="Gbps" />
                <SpecRow label="NGFW Throughput" value={selectedDevice.ngfw_throughput_gbps} unit="Gbps" />
                <SpecRow label="Threat Protection" value={selectedDevice.threat_protection_gbps} unit="Gbps" />
                <SpecRow label="SSL Proxy" value={selectedDevice.ssl_proxy_throughput_gbps} unit="Gbps" />
              </SpecCard>

              <SpecCard icon={Wifi} title="VPN Performance">
                <SpecRow label="IPsec VPN" value={selectedDevice.ipsec_vpn_throughput_gbps} unit="Gbps" />
                <SpecRow label="Gateway-to-Gateway VPN" value={formatNumber(selectedDevice.gateway_to_gateway_vpn)} unit="tunnels" />
                <SpecRow label="SSL VPN Users (Max)" value={formatNumber(selectedDevice.ssl_vpn_users_max)} unit="users" />
              </SpecCard>

              <SpecCard icon={HardDrive} title="Sessions & Capacity">
                <SpecRow label="Concurrent Sessions" value={formatNumber(selectedDevice.concurrent_sessions)} />
                <SpecRow label="New Sessions/sec" value={formatNumber(selectedDevice.new_sessions_per_sec)} />
                <SpecRow label="Firewall Policies (Max)" value={formatNumber(selectedDevice.firewall_policy_max)} />
              </SpecCard>

              <SpecCard icon={Users} title="Virtualization">
                <SpecRow label="Virtual Systems (Default)" value={selectedDevice.virtual_systems_default} />
                <SpecRow label="Virtual Systems (Max)" value={selectedDevice.virtual_systems_max} />
              </SpecCard>

              <SpecCard icon={Network} title="Interfaces">
                <SpecRow label="GE RJ45 Ports" value={selectedDevice.ge_rj45_ports} />
                <SpecRow label="GE SFP Ports" value={selectedDevice.ge_sfp_ports} />
                <SpecRow label="10GE SFP+ Ports" value={selectedDevice.ten_ge_sfp_ports} />
                <SpecRow label="FortiLink Ports" value={selectedDevice.fortilink_ports} />
                <SpecRow label="WAN Ports" value={selectedDevice.wan_ports} />
                <SpecRow label="HA Ports" value={selectedDevice.ha_ports} />
              </SpecCard>
            </div>

            {selectedDevice.interface_raw && (
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h3 className="font-semibold text-gray-200 mb-2">Interface Details</h3>
                <p className="text-gray-400 text-sm">{selectedDevice.interface_raw}</p>
              </div>
            )}
          </div>
        )}

        {!selectedDevice && devices.length > 0 && (
          <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
            <Network className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Select a device above to view detailed specifications</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;