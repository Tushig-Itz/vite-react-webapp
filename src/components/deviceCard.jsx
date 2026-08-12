import { Check, Plus } from 'lucide-react';

export const DeviceCard = ({
  device,
  isSelected,
  onClick,
  cardSpecs = [],
  isCompared = false,
  onToggleCompare,
  compareFull = false,
}) => {
  const fmt = (v, unit) => (v || v === 0 ? `${v}${unit ? ' ' + unit : ''}` : 'N/A');
  const missing = cardSpecs.filter((s) => !(device[s.key] || device[s.key] === 0)).length;

  return (
    <div className={`device-card-wrap ${isCompared ? 'comparing' : ''}`}>
      <button onClick={onClick} className={`device-card ${isSelected ? 'selected' : ''}`}>
        <h3>{device.model}</h3>
        <div className="series">{device.series || 'N/A'} Series</div>
        <div className="specs">
          {cardSpecs.map((s, i) => (
            <div className="spec-line" key={i}>
              <span style={{ color: '#9ca3af' }}>{s.label}:</span>
              <span>{fmt(device[s.key], s.unit)}</span>
            </div>
          ))}
        </div>
        {missing > 0 && <div className="device-card-incomplete">specs incomplete</div>}
      </button>

      {onToggleCompare && (
        <button
          type="button"
          className={`compare-toggle ${isCompared ? 'on' : ''}`}
          title={isCompared ? 'Remove from comparison' : 'Add to comparison'}
          aria-label={isCompared ? `Remove ${device.model} from comparison` : `Add ${device.model} to comparison`}
          aria-pressed={isCompared}
          disabled={!isCompared && compareFull}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCompare(device);
          }}
        >
          {isCompared ? <Check size={14} /> : <Plus size={14} />}
        </button>
      )}
    </div>
  );
};
