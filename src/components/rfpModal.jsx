import { useState } from 'react';
import { X, FileText } from 'lucide-react';

// Requirement fields come from the active product's `requirementSpecs`, so the
// same modal serves firewalls, switches and APs.
export function RfpModal({ isOpen, onClose, onSave, initialData = {}, fields = [], productLabel = '' }) {
  const emptyState = () => fields.reduce((acc, f) => ({ ...acc, [f.key]: '' }), {});
  const [requirements, setRequirements] = useState(() => {
    const base = emptyState();
    fields.forEach(f => { base[f.key] = initialData[f.key] || ''; });
    return base;
  });

  // Reset when the product (and therefore the field list) changes.
  const fieldSig = fields.map(f => f.key).join('|');
  const [lastSig, setLastSig] = useState(fieldSig);
  if (fieldSig !== lastSig) {
    setLastSig(fieldSig);
    setRequirements(emptyState());
  }

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
            Enter customer requirements for {productLabel ? `${productLabel.toLowerCase()} ` : ''}
            RFP comparison. Leave fields blank if not specified.
          </p>

          <div className="rfp-section">
            <h3>Performance Specs</h3>
            <div className="rfp-grid">
              {fields.map(f => (
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
