import { useState } from 'react';
import { X, FileText } from 'lucide-react';

// Requirement fields the user can specify (aligned with the RFP filter + exports)
const FIELDS = [
  { key: 'firewall_throughput_1518_gbps', label: 'Firewall Throughput (Gbps)', placeholder: 'e.g., 5' },
  { key: 'ngfw_throughput_gbps', label: 'NGFW Throughput (Gbps)', placeholder: 'e.g., 1.25' },
  { key: 'threat_protection_gbps', label: 'Threat Protection Throughput (Gbps)', placeholder: 'e.g., 1.1' },
  { key: 'ips_throughput_gbps', label: 'IPS Throughput (Gbps)', placeholder: 'e.g., 2.25' },
  { key: 'ipsec_vpn_throughput_gbps', label: 'IPsec VPN Throughput (Gbps)', placeholder: 'e.g., 4.5' },
  { key: 'ssl_inspection_throughput_gbps', label: 'SSL Inspection Throughput (Gbps)', placeholder: 'e.g., 1.3' },
  { key: 'concurrent_sessions', label: 'Concurrent Sessions (TCP)', placeholder: 'e.g., 720000' },
  { key: 'new_sessions_per_sec', label: 'New Session/Second (TCP)', placeholder: 'e.g., 85000' },
  { key: 'gateway_to_gateway_vpn', label: 'Gateway-to-Gateway Tunnels', placeholder: 'e.g., 200' },
  { key: 'client_to_gateway_tunnels', label: 'Client-to-Gateway Tunnels', placeholder: 'e.g., 250' },
  { key: 'virtual_systems_max', label: 'Virtual Domains (Max)', placeholder: 'e.g., 5' },
];

const emptyState = () => FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: '' }), {});

export function RfpModal({ isOpen, onClose, onSave, initialData = {} }) {
  const [requirements, setRequirements] = useState(() => {
    const base = emptyState();
    FIELDS.forEach(f => { base[f.key] = initialData[f.key] || ''; });
    return base;
  });

  const handleChange = (field, value) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setRequirements(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(requirements);
    onClose();
  };

  const handleClear = () => setRequirements(emptyState());

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileText size={24} />
            <h2>RFP Requirements</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>
            Enter customer requirements for RFP comparison. Leave fields blank if not specified.
          </p>

          <div className="rfp-section">
            <h3>Performance Specs</h3>
            <div className="rfp-grid">
              {FIELDS.map(f => (
                <div className="rfp-field" key={f.key}>
                  <label>{f.label}</label>
                  <input
                    type="text"
                    value={requirements[f.key]}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" onClick={handleClear} className="btn-secondary">
            Clear All
          </button>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} className="btn-primary">
              Save Requirements
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
