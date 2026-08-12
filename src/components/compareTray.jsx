import { GitCompare, X, Download } from 'lucide-react';

// Persistent dock. Comparison is the product's main job, so selection state
// stays visible while you search, sort and switch views — it isn't hidden
// behind a modal that duplicates the grid.
export const CompareTray = ({ devices = [], max = 5, onRemove, onClear, onExport }) => {
  if (!devices.length) return null;
  const ready = devices.length >= 2;

  return (
    <div className="compare-tray" role="region" aria-label="Comparison selection">
      <div className="compare-tray-inner">
        <div className="compare-tray-lead">
          <GitCompare size={18} />
          <strong>{devices.length}</strong>
          <span className="compare-tray-of">of {max} selected</span>
        </div>

        <div className="compare-tray-chips">
          {devices.map((d) => (
            <span className="compare-chip" key={d.model}>
              {d.model}
              <button type="button" onClick={() => onRemove(d)} aria-label={`Remove ${d.model}`}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>

        <div className="compare-tray-actions">
          <button type="button" className="btn-secondary" onClick={onClear}>Clear</button>
          <button
            type="button"
            className="export-button"
            onClick={onExport}
            disabled={!ready}
            title={ready ? 'Export comparison spreadsheet' : 'Select at least 2 models'}
          >
            <Download size={16} />
            Export comparison
          </button>
        </div>
      </div>
      {!ready && <p className="compare-tray-hint">Pick one more model to export a comparison.</p>}
    </div>
  );
};
