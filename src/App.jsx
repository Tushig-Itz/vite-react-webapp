import { useState, useEffect, useMemo } from 'react';
import { Download, Zap, Shield, Wifi, HardDrive, Users, Network, FileText, ArrowUpNarrowWide, LayoutGrid, Rows } from 'lucide-react';
import { SearchBar } from './components/searchBar';
import { DeviceGrid } from './components/deviceGrid';
import { DeviceTable } from './components/deviceTable.jsx';
import { CompareTray } from './components/compareTray.jsx';
import { RfpModal } from './components/rfpModal.jsx';
import { exportSingleWithRFP, exportMultipleModels, exportRfpMatch } from './utils/excelExport';
import { formatNumber } from './utils/formatters';
import { PRODUCT_TYPES, PRODUCT_ORDER, sortDevices, groupIntoTiers } from './productConfig';
import './App.css';

const ICONS = { Zap, Shield, Wifi, HardDrive, Users, Network, FileText };

const has = (v) => v !== null && v !== undefined && String(v).trim() !== '';

function App() {
  const [productType, setProductType] = useState('firewall');
  const [searchTerm, setSearchTerm] = useState('');
  const [devices, setDevices] = useState([]);
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRfpModal, setShowRfpModal] = useState(false);
  const [compareList, setCompareList] = useState([]);
  const [view, setView] = useState('cards');
  const [rfpRequirements, setRfpRequirements] = useState({});
  const [rfpFilterActive, setRfpFilterActive] = useState(false);
  const [sortIdx, setSortIdx] = useState(0);

  const product = PRODUCT_TYPES[productType];
  const sortOptions = product.sortOptions || [];
  const activeSort = sortOptions[sortIdx] || sortOptions[0];

  // Fetch whenever the product type changes.
  useEffect(() => {
    fetchDevices(product.apiType);
    setSelectedDevice(null);
    setSearchTerm('');
    setRfpRequirements({});
    setRfpFilterActive(false);
    setSortIdx(0);
    setCompareList([]);
  }, [productType]);

  const MAX_COMPARE = 5;
  const toggleCompare = (device) => {
    setCompareList((prev) => {
      if (prev.some((d) => d.model === device.model)) return prev.filter((d) => d.model !== device.model);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, device];
    });
  };

  useEffect(() => {
    let filtered = devices;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(d =>
        d.model.toLowerCase().includes(term) ||
        (d.model_norm && d.model_norm.toLowerCase().includes(term)) ||
        (d.series && d.series.toLowerCase().includes(term)) ||
        // Interface text is how people actually describe what they need
        // ("sfp28", "poe", "48x GE") — worth matching on.
        (d.interface_raw && d.interface_raw.toLowerCase().includes(term))
      );
    }
    if (rfpFilterActive && Object.keys(rfpRequirements).length > 0) {
      // filterByRfpRequirements ranks by closeness of fit — don't re-sort over it.
      filtered = filterByRfpRequirements(filtered, rfpRequirements);
    } else {
      filtered = sortDevices(filtered, activeSort);
    }
    setFilteredDevices(filtered);
  }, [searchTerm, devices, rfpFilterActive, rfpRequirements, sortIdx, productType]);

  // Tier bands (Entry / Mid / Enterprise / DC). Skipped while the RFP filter is
  // ranking by fit, since banding would fight the ranking.
  const deviceGroups = useMemo(
    () => (rfpFilterActive
      ? [{ label: null, devices: filteredDevices }]
      : groupIntoTiers(filteredDevices, product)),
    [filteredDevices, product, rfpFilterActive]
  );

  // The filter already ranks by closeness of fit, so filteredDevices[0] IS the
  // best match — surface it explicitly along with its tightest margin, so the
  // answer is "quote this one, and here's the headroom" rather than a shortlist.
  const bestFit = useMemo(() => {
    if (!rfpFilterActive || !filteredDevices.length) return null;
    const device = filteredDevices[0];
    const num = (v) => {
      const m = String(v ?? '').trim().match(/^(\d+\.?\d*)/);
      return m ? parseFloat(m[1]) : 0;
    };
    let tightest = null;
    let met = 0;
    (product.requirementSpecs || []).forEach((spec) => {
      const req = num(rfpRequirements[spec.key]);
      if (!req) return;
      met += 1;
      const ratio = num(device[spec.key]) / req;
      if (!tightest || ratio < tightest.ratio) tightest = { ratio, label: spec.label };
    });
    return { device, met, tightest, alternatives: filteredDevices.length - 1 };
  }, [rfpFilterActive, filteredDevices, rfpRequirements, product]);

  // Keep devices whose specs meet/exceed every set requirement, ranked by fit.
  // Driven by the product's requirementSpecs, so it works for all three types.
  const filterByRfpRequirements = (deviceList, requirements) => {
    const specs = (product.requirementSpecs || []).map(s => s.key);
    const parseValue = (val) => {
      if (typeof val === 'number') return val;
      const m = String(val).trim().match(/^(\d+\.?\d*)/);
      return m ? parseFloat(m[1]) : 0;
    };
    return deviceList.filter(device =>
      specs.every(spec => {
        const req = requirements[spec];
        if (!req) return true;
        if (!has(device[spec])) return false;
        return parseValue(device[spec]) >= parseValue(req);
      })
    ).sort((a, b) => {
      // Ascending: the LEAST over-provisioned model that still clears every bar
      // comes first. Everything here already meets the requirements, so the
      // useful answer for a quote is the smallest adequate box, not the biggest.
      let sa = 0, sb = 0;
      specs.forEach(spec => {
        const req = requirements[spec];
        if (!req) return;
        const rn = parseValue(req);
        if (rn > 0) { sa += parseValue(a[spec] || 0) / rn; sb += parseValue(b[spec] || 0) / rn; }
      });
      return sa - sb;
    });
  };

  const fetchDevices = async (apiType) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/devices?type=${apiType}`);
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

  const handleExportSingle = async () => {
    try { await exportSingleWithRFP(selectedDevice, formatNumber, rfpRequirements, product); }
    catch (e) { alert(`Export failed: ${e.message}`); }
  };
  const handleExportMultiple = async (models) => {
    try { await exportMultipleModels(models, formatNumber, product); }
    catch (e) { alert(`Export failed: ${e.message}`); }
  };
  const handleGenerateRfpFor = async (device) => {
    try { await exportRfpMatch(device, formatNumber, rfpRequirements, { product }); }
    catch (e) { alert(`RFP generation failed: ${e.message}`); }
  };
  const handleGenerateRfp = () => handleGenerateRfpFor(selectedDevice);

  const handleSaveRfp = (requirements) => {
    setRfpRequirements(requirements);
    setRfpFilterActive(Object.values(requirements).some(v => v !== ''));
  };
  const handleClearRfp = () => { setRfpRequirements({}); setRfpFilterActive(false); };
  const hasRfpRequirements = Object.values(rfpRequirements).some(v => v !== '');

  const renderValue = (device, row) => {
    if (row.count) return formatNumber(device[row.key]);
    if (!has(device[row.key])) return 'N/A';
    return <>{device[row.key]}{row.unit && <span className="unit"> {row.unit}</span>}</>;
  };

  if (loading) return <div className="loading"><div className="spinner"></div><p>Loading {product.label.toLowerCase()}s...</p></div>;
  if (error) return <div className="loading"><p style={{ color: '#ef4444' }}>Error: {error}</p></div>;

  return (
    <div>
      <div className="header">
        <div>
          <h1>Fortinet Specs Lookup</h1>
          <p>Quick reference for Fortinet {product.label} specifications</p>
        </div>
        <div className="header-buttons">
          {(product.requirementSpecs || []).length > 0 && (
            <button onClick={() => setShowRfpModal(true)} className="rfp-button">
              <FileText size={18} />
              {hasRfpRequirements ? 'Edit RFP' : 'Create RFP'}
              {hasRfpRequirements && <span className="rfp-badge">✓</span>}
            </button>
          )}
          <div className="view-toggle" role="group" aria-label="View mode">
            <button
              className={view === 'cards' ? 'on' : ''}
              onClick={() => setView('cards')}
              aria-pressed={view === 'cards'}
            >
              <LayoutGrid size={16} /> Cards
            </button>
            <button
              className={view === 'table' ? 'on' : ''}
              onClick={() => setView('table')}
              aria-pressed={view === 'table'}
            >
              <Rows size={16} /> Table
            </button>
          </div>
        </div>
      </div>

      {/* Product type selector */}
      <div className="product-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {PRODUCT_ORDER.map(key => {
          const p = PRODUCT_TYPES[key];
          const active = key === productType;
          return (
            <button
              key={key}
              onClick={() => setProductType(key)}
              className={active ? 'btn-primary' : 'btn-secondary'}
              style={{ fontWeight: active ? 600 : 400 }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="list-controls">
        <div className="list-controls-search">
          <SearchBar value={searchTerm} onChange={setSearchTerm} />
        </div>
        {sortOptions.length > 0 && (
          <label className="sort-control">
            <ArrowUpNarrowWide size={16} />
            <span className="sort-control-label">Sort by</span>
            <select
              value={sortIdx}
              onChange={(e) => setSortIdx(Number(e.target.value))}
              className="sort-select"
            >
              {sortOptions.map((o, i) => (
                <option key={o.label} value={i}>{o.label}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {hasRfpRequirements && (
        <div style={{
          marginBottom: '1.5rem', padding: '1rem',
          background: rfpFilterActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)',
          border: `1px solid ${rfpFilterActive ? '#10b981' : '#6b7280'}`, borderRadius: '0.75rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
        }}>
          <div>
            <p style={{ fontWeight: '500', color: '#e5e7eb', marginBottom: '0.25rem' }}>
              RFP Filter: {rfpFilterActive ? 'Active' : 'Inactive'}
            </p>
            <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
              {rfpFilterActive
                ? `Showing ${filteredDevices.length} ${product.label.toLowerCase()}(s) that meet all requirements`
                : 'Click "Activate Filter" to show only matching devices'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => setRfpFilterActive(!rfpFilterActive)}
              className={rfpFilterActive ? 'btn-secondary' : 'btn-primary'} style={{ fontSize: '0.875rem' }}>
              {rfpFilterActive ? 'Deactivate Filter' : 'Activate Filter'}
            </button>
            <button onClick={handleClearRfp} className="btn-secondary" style={{ fontSize: '0.875rem' }}>
              Clear RFP
            </button>
          </div>
        </div>
      )}

      {bestFit && (
        <div className="best-fit">
          <div className="best-fit-badge">Recommended</div>
          <div className="best-fit-body">
            <button className="best-fit-model" onClick={() => setSelectedDevice(bestFit.device)}>
              {bestFit.device.model}
            </button>
            <span className="best-fit-detail">
              meets all {bestFit.met} requirement{bestFit.met === 1 ? '' : 's'}
              {bestFit.tightest && Number.isFinite(bestFit.tightest.ratio) && (
                <> · tightest margin <strong>{bestFit.tightest.ratio.toFixed(2)}×</strong> on {bestFit.tightest.label}</>
              )}
              {bestFit.alternatives > 0 && <> · {bestFit.alternatives} other option{bestFit.alternatives === 1 ? '' : 's'} below</>}
            </span>
          </div>
          <button className="rfp-button" onClick={() => { setSelectedDevice(bestFit.device); handleGenerateRfpFor(bestFit.device); }}>
            <FileText size={16} />
            Generate RFP
          </button>
        </div>
      )}

      {filteredDevices.length > 0 ? (
        view === 'table' ? (
          <DeviceTable
            groups={deviceGroups}
            selectedDevice={selectedDevice}
            onSelectDevice={setSelectedDevice}
            columns={(product.comparisonSpecs || []).slice(0, 6)}
            formatNumber={formatNumber}
            compareList={compareList}
            onToggleCompare={toggleCompare}
            compareFull={compareList.length >= MAX_COMPARE}
            sortOptions={sortOptions}
            sortIdx={sortIdx}
            onSortChange={setSortIdx}
          />
        ) : (
          <DeviceGrid
            groups={deviceGroups}
            selectedDevice={selectedDevice}
            onSelectDevice={setSelectedDevice}
            cardSpecs={product.cardSpecs}
            compareList={compareList}
            onToggleCompare={toggleCompare}
            compareFull={compareList.length >= MAX_COMPARE}
          />
        )
      ) : (
        <div className="empty-state">
          <p>No {product.label.toLowerCase()}s found{searchTerm ? ` matching "${searchTerm}"` : ''}</p>
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
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={handleExportSingle} className="export-button">
                  <Download size={18} />
                  Export to Excel
                </button>
                <button onClick={handleGenerateRfp} className="rfp-button">
                  <FileText size={18} />
                  Generate RFP
                </button>
              </div>
            </div>
          </div>

          <div className="spec-grid">
            {product.detailGroups.map((group, gi) => {
              const Icon = ICONS[group.icon] || Network;
              return (
                <div className="spec-card" key={gi}>
                  <div className="spec-card-header">
                    <Icon size={20} />
                    <h3>{group.title}</h3>
                  </div>
                  <div>
                    {group.rows.map((row, ri) => (
                      <div className="spec-row" key={ri}>
                        <span className="spec-label">{row.label}</span>
                        <span className="spec-value">{renderValue(selectedDevice, row)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedDevice.interface_raw && (
            <div className="spec-card" style={{ marginTop: '1.5rem' }}>
              <div className="spec-card-header">
                <Network size={16} />
                <h3>Interface Details</h3>
              </div>
              <p style={{ color: '#9ca3af', fontSize: '0.875rem', lineHeight: '1.6' }}>
                {selectedDevice.interface_raw}
              </p>
            </div>
          )}

          {(selectedDevice.release_year || selectedDevice.datasheet_date || selectedDevice.datasheet_url) && (
            <div className="spec-card" style={{ marginTop: '1.5rem' }}>
              <div className="spec-card-header">
                <FileText size={16} />
                <h3>Source &amp; Lifecycle</h3>
              </div>
              <div>
                {selectedDevice.release_year && (
                  <div className="spec-row"><span className="spec-label">Release Year</span><span className="spec-value">{selectedDevice.release_year}</span></div>
                )}
                {selectedDevice.support_years && (
                  <div className="spec-row"><span className="spec-label">Support Years</span><span className="spec-value">{selectedDevice.support_years}</span></div>
                )}
                {selectedDevice.datasheet_date && (
                  <div className="spec-row"><span className="spec-label">Datasheet Date</span><span className="spec-value">{selectedDevice.datasheet_date}</span></div>
                )}
                {selectedDevice.datasheet_url && (
                  <div className="spec-row">
                    <span className="spec-label">Datasheet</span>
                    <span className="spec-value">
                      <a href={selectedDevice.datasheet_url} target="_blank" rel="noopener noreferrer"
                        style={{ color: '#10b981', textDecoration: 'underline', wordBreak: 'break-all' }}>
                        View source
                      </a>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <RfpModal
        isOpen={showRfpModal}
        onClose={() => setShowRfpModal(false)}
        onSave={handleSaveRfp}
        initialData={rfpRequirements}
        fields={product.requirementSpecs || []}
        productLabel={product.label}
      />

      <CompareTray
        devices={compareList}
        max={MAX_COMPARE}
        onRemove={toggleCompare}
        onClear={() => setCompareList([])}
        onExport={() => handleExportMultiple(compareList)}
      />
    </div>
  );
}

export default App;
