import { useState } from 'react';
import { X, FileText } from 'lucide-react';
//...

export function RfpModal({ isOpen, onClose, onSave, initialData = {} }) {
  const [requirements, setRequirements] = useState({
    firewall_throughput_1518_gbps: initialData.firewall_throughput_1518_gbps || '',
    ngfw_throughput_gbps: initialData.ngfw_throughput_gbps || '',
    threat_protection_gbps: initialData.threat_protection_gbps || '',
    concurrent_sessions: initialData.concurrent_sessions || '',
    new_sessions_per_sec: initialData.new_sessions_per_sec || '',
    ips_throughput_gbps: initialData.ips_throughput_gbps || '',
    av_throughput_gbps: initialData.av_throughput_gbps || '',
    ipsec_vpn_throughput_gbps: initialData.ipsec_vpn_throughput_gbps || '',
    ssl_proxy_throughput_gbps: initialData.ssl_proxy_throughput_gbps || '',
    virtual_systems_max: initialData.virtual_systems_max || '',
    ssl_vpn_users_max: initialData.ssl_vpn_users_max || '',
    gateway_to_gateway_vpn: initialData.gateway_to_gateway_vpn || '',
    firewall_policy_max: initialData.firewall_policy_max || '',
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

  const handleClear = () => {
    setRequirements({
      firewall_throughput_1518_gbps: '',
      ngfw_throughput_gbps: '',
      threat_protection_gbps: '',
      concurrent_sessions: '',
      new_sessions_per_sec: '',
      ips_throughput_gbps: '',
      av_throughput_gbps: '',
      ipsec_vpn_throughput_gbps: '',
      ssl_proxy_throughput_gbps: '',
      virtual_systems_max: '',
      ssl_vpn_users_max: '',
      gateway_to_gateway_vpn: '',
      firewall_policy_max: '',
    });
  };

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

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>
              Enter customer requirements for RFP comparison. Leave fields blank if not specified.
            </p>

            {/* Matches exact order from excelExport */}
            <div className="rfp-section">
              <h3>Performance Specs</h3>
              <div className="rfp-grid">
                <div className="rfp-field">
                  <label>Firewall Throughput (Gbps)</label>
                  <input
                    type="text"
                    value={requirements.firewall_throughput_1518_gbps}
                    onChange={(e) => handleChange('firewall_throughput_1518_gbps', e.target.value)}
                    placeholder="e.g., 39"
                  />
                </div>
                <div className="rfp-field">
                  <label>NGFW Throughput (Gbps)</label>
                  <input
                    type="text"
                    value={requirements.ngfw_throughput_gbps}
                    onChange={(e) => handleChange('ngfw_throughput_gbps', e.target.value)}
                    placeholder="e.g., 7"
                  />
                </div>
                <div className="rfp-field">
                  <label>Threat Protection Throughput (Gbps)</label>
                  <input
                    type="text"
                    value={requirements.threat_protection_gbps}
                    onChange={(e) => handleChange('threat_protection_gbps', e.target.value)}
                    placeholder="e.g., 6"
                  />
                </div>
                <div className="rfp-field">
                  <label>Concurrent Sessions (TCP)</label>
                  <input
                    type="text"
                    value={requirements.concurrent_sessions}
                    onChange={(e) => handleChange('concurrent_sessions', e.target.value)}
                    placeholder="e.g., 3000000"
                  />
                </div>
                <div className="rfp-field">
                  <label>New Session/Second (TCP)</label>
                  <input
                    type="text"
                    value={requirements.new_sessions_per_sec}
                    onChange={(e) => handleChange('new_sessions_per_sec', e.target.value)}
                    placeholder="e.g., 300000"
                  />
                </div>
                <div className="rfp-field">
                  <label>IPS Throughput (Gbps)</label>
                  <input
                    type="text"
                    value={requirements.ips_throughput_gbps}
                    onChange={(e) => handleChange('ips_throughput_gbps', e.target.value)}
                    placeholder="e.g., 9"
                  />
                </div>
                <div className="rfp-field">
                  <label>AV Throughput (Gbps)</label>
                  <input
                    type="text"
                    value={requirements.av_throughput_gbps}
                    onChange={(e) => handleChange('av_throughput_gbps', e.target.value)}
                    placeholder="e.g., 6"
                  />
                </div>
                <div className="rfp-field">
                  <label>IPsec VPN Throughput (Gbps)</label>
                  <input
                    type="text"
                    value={requirements.ipsec_vpn_throughput_gbps}
                    onChange={(e) => handleChange('ipsec_vpn_throughput_gbps', e.target.value)}
                    placeholder="e.g., 5"
                  />
                </div>
                <div className="rfp-field">
                  <label>SSL Proxy Throughput (Gbps)</label>
                  <input
                    type="text"
                    value={requirements.ssl_proxy_throughput_gbps}
                    onChange={(e) => handleChange('ssl_proxy_throughput_gbps', e.target.value)}
                    placeholder="e.g., 7"
                  />
                </div>
                <div className="rfp-field">
                  <label>Virtual Systems (Max)</label>
                  <input
                    type="text"
                    value={requirements.virtual_systems_max}
                    onChange={(e) => handleChange('virtual_systems_max', e.target.value)}
                    placeholder="e.g., 10"
                  />
                </div>
                <div className="rfp-field">
                  <label>SSL VPN Users (Max)</label>
                  <input
                    type="text"
                    value={requirements.ssl_vpn_users_max}
                    onChange={(e) => handleChange('ssl_vpn_users_max', e.target.value)}
                    placeholder="e.g., 500"
                  />
                </div>
                <div className="rfp-field">
                  <label>Gateway-to-Gateway VPN</label>
                  <input
                    type="text"
                    value={requirements.gateway_to_gateway_vpn}
                    onChange={(e) => handleChange('gateway_to_gateway_vpn', e.target.value)}
                    placeholder="e.g., 2000"
                  />
                </div>
                <div className="rfp-field">
                  <label>Firewall Policy (Max)</label>
                  <input
                    type="text"
                    value={requirements.firewall_policy_max}
                    onChange={(e) => handleChange('firewall_policy_max', e.target.value)}
                    placeholder="e.g., 10000"
                  />
                </div>
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
              <button type="submit" className="btn-primary">
                Save Requirements
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
