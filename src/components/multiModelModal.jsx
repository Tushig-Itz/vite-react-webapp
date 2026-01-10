import { useState, useEffect } from 'react';
import { X, GitCompare, Search, Check } from 'lucide-react';
import { DeviceCard } from './deviceCard.jsx';

export function MultiModelModal({ isOpen, onClose, devices, onExport }) {
  const [selectedModels, setSelectedModels] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredDevices, setFilteredDevices] = useState(devices);
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredDevices(devices);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = devices.filter(device =>
        device.model.toLowerCase().includes(term) ||
        device.model_norm?.toLowerCase().includes(term) ||
        (device.series && device.series.toLowerCase().includes(term))
      );
      setFilteredDevices(filtered);
    }
  }, [searchTerm, devices]);

  const toggleModel = (device) => {
    setSelectedModels(prev => {
      const isSelected = prev.some(d => d.model === device.model);
      if (isSelected) {
        return prev.filter(d => d.model !== device.model);
      } else {
        if (prev.length >= 5) {
          alert('Maximum 5 models can be compared');
          return prev;
        }
        return [...prev, device];
      }
    });
  };

  const handleExport = () => {
    if (selectedModels.length < 2) {
      alert('Please select at least 2 models to compare');
      return;
    }
    onExport(selectedModels);
    onClose();
  };

  const handleClear = () => {
    setSelectedModels([]);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <GitCompare size={24} />
            <h2>Compare Multiple Models</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
            <p style={{ color: '#9ca3af' }}>
              Select 2-5 models to compare ({selectedModels.length} selected)
            </p>
            {selectedModels.length > 0 && (
              <button type="button" onClick={handleClear} className="btn-link">
                Clear Selection
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div className="search-container" style={{ marginBottom: '1.5rem' }}>
            <input
              type="text"
              className="search-input"
              placeholder="Search models..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="search-icon" size={20} />
          </div>

          {/* Device Grid */}
          <div className="model-selection-grid">
            {filteredDevices.map((device) => {
              const isSelected = selectedModels.some(d => d.model === device.model);
              return (
                <div key={device.model} style={{ position: 'relative' }}>
                  {isSelected && (
                    <div className="selection-check">
                      <Check size={16} />
                    </div>
                  )}
                  <DeviceCard
                    device={device}
                    isSelected={isSelected}
                    onClick={() => toggleModel(device)}
                  />
                </div>
              );
            })}
          </div>

          {filteredDevices.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
              No devices found matching "{searchTerm}"
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
            {selectedModels.length < 2 && 'Select at least 2 models'}
            {selectedModels.length >= 2 && `${selectedModels.length} models ready to compare`}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button 
              type="button" 
              onClick={handleExport} 
              className="btn-primary"
              disabled={selectedModels.length < 2}
              style={{ opacity: selectedModels.length < 2 ? 0.5 : 1 }}
            >
              Export Comparison
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}