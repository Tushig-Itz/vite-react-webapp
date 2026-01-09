import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
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

  const formatNumber = (num) => {
    if (!num && num !== 0) return 'N/A';
    return num.toLocaleString();
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
              <button onClick={handleExport} style={{
              }}>
                <Download size={18} />
                Export to Excel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;