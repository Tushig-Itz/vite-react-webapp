import { Fragment } from 'react';
import { Check, Plus } from 'lucide-react';

// Dense view. Cards are for browsing; this is for comparing — the whole
// catalogue on one screen, sortable by any column, selectable inline.
export const DeviceTable = ({
  groups,
  selectedDevice,
  onSelectDevice,
  columns = [],
  formatNumber,
  compareList = [],
  onToggleCompare,
  compareFull = false,
  sortOptions = [],
  sortIdx = 0,
  onSortChange,
}) => {
  const cell = (device, col) => {
    const v = device[col.key];
    if (v === null || v === undefined || String(v).trim() === '') return <span className="tbl-na">—</span>;
    return (
      <>
        {col.count && formatNumber ? formatNumber(v) : v}
        {col.unit && <span className="tbl-unit"> {col.unit}</span>}
      </>
    );
  };

  // A column is sortable when a sortOption targets the same key.
  const sortIdxFor = (col) => sortOptions.findIndex((o) => o.key && o.key === col.key);

  return (
    <div className="device-table-wrap">
      <table className="device-table">
        <thead>
          <tr>
            {onToggleCompare && <th className="tbl-pick" />}
            <th>Model</th>
            <th>Series</th>
            {columns.map((col) => {
              const si = sortIdxFor(col);
              const active = si >= 0 && si === sortIdx;
              return (
                <th
                  key={col.key}
                  className={`tbl-num ${si >= 0 ? 'sortable' : ''} ${active ? 'sorted' : ''}`}
                  onClick={si >= 0 ? () => onSortChange?.(si) : undefined}
                >
                  {col.label}
                  {col.unit ? ` (${col.unit})` : ''}
                  {active && <span className="tbl-caret"> ▲</span>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {groups.map((group, gi) => (
            <Fragment key={group.label || gi}>
              {group.label && (
                <tr className="tbl-band">
                  <td colSpan={columns.length + (onToggleCompare ? 3 : 2)}>
                    {group.label}
                    {group.hint && <span className="tbl-band-hint"> — {group.hint}</span>}
                  </td>
                </tr>
              )}
              {group.devices.map((device) => {
                const picked = compareList.some((d) => d.model === device.model);
                return (
                  <tr
                    key={device.id}
                    className={`${selectedDevice?.id === device.id ? 'sel' : ''} ${picked ? 'picked' : ''}`}
                    onClick={() => onSelectDevice(device)}
                  >
                    {onToggleCompare && (
                      <td className="tbl-pick">
                        <button
                          type="button"
                          className={`compare-toggle sm ${picked ? 'on' : ''}`}
                          aria-pressed={picked}
                          aria-label={picked ? `Remove ${device.model}` : `Add ${device.model}`}
                          disabled={!picked && compareFull}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleCompare(device);
                          }}
                        >
                          {picked ? <Check size={12} /> : <Plus size={12} />}
                        </button>
                      </td>
                    )}
                    <td className="tbl-model">{device.model}</td>
                    <td className="tbl-series">{device.series || '—'}</td>
                    {columns.map((col) => (
                      <td key={col.key} className="tbl-num">{cell(device, col)}</td>
                    ))}
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};
