// Central per-product-type configuration. Everything type-specific (which table
// to query, what the grid card shows, detail-page groups, comparison rows, and
// the RFP spec lines) is driven from here so the UI and exports stay generic.
//
// Spec row shape: { label, key, unit?, count?, keys?, sep? }
//   - key            -> device[key]
//   - keys + sep     -> combine multiple fields, e.g. "5 / 5 / 4"
//   - unit           -> appended after the value
//   - count: true    -> format with thousands separators (formatNumber)
// icon is a lucide-react icon name resolved in the UI.
//
// Ordering & grouping (added Aug 2026):
//   sortOptions  -> [{ label, key }] | [{ label, sum: [keys] }] | [{ label, key, text: true }]
//                   The first entry is the default. Cards are ordered by capability so a
//                   card's POSITION carries meaning; the API's ORDER BY model is a string
//                   sort and put FG-1000F before FG-100F.
//   tierBy       -> 'modelNumber' (bucket by the digits in the model) or 'field'
//   tiers        -> [{ label, hint, max }] for modelNumber, [{ label, hint, values }] for field

// "FG-1000F" -> 1000, "T1024F-FPOE" -> 1024, "M426E-FPOE" -> 426, "108F" -> 108
export const modelNumber = (model) => {
  const m = String(model || '').replace(/^[A-Z]+-/i, '').match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
};

export const sortValue = (device, opt) => {
  if (!opt) return 0;
  if (opt.text) return String(device[opt.key] ?? '');
  if (opt.sum) return opt.sum.reduce((t, k) => t + (parseFloat(device[k]) || 0), 0);
  return parseFloat(device[opt.key]) || 0;
};

// True when the device actually carries the metric being sorted on. A missing
// spec must NOT sort as 0 — that would rank an under-documented model as the
// smallest one, which is how FAP-831F ended up ahead of everything indoors.
export const hasSortValue = (device, opt) => {
  if (!opt) return false;
  const filled = (k) => device[k] !== null && device[k] !== undefined && String(device[k]).trim() !== '';
  if (opt.sum) return opt.sum.some(filled);
  return filled(opt.key);
};

export const sortDevices = (devices, opt) => {
  const list = [...devices];
  if (!opt) return list;
  const byModel = (a, b) => String(a.model).localeCompare(String(b.model), undefined, { numeric: true });
  return list.sort((a, b) => {
    if (opt.text) {
      return String(sortValue(a, opt)).localeCompare(String(sortValue(b, opt)), undefined, { numeric: true });
    }
    const ha = hasSortValue(a, opt);
    const hb = hasSortValue(b, opt);
    if (ha !== hb) return ha ? -1 : 1;   // devices missing the metric go last
    if (!ha) return byModel(a, b);
    const va = sortValue(a, opt);
    const vb = sortValue(b, opt);
    return va !== vb ? va - vb : byModel(a, b);
  });
};

// Split an already-sorted list into labelled tier bands. Empty bands are dropped.
export const groupIntoTiers = (devices, product) => {
  const tiers = product?.tiers;
  if (!tiers?.length) return [{ label: null, devices }];
  const buckets = tiers.map((t) => ({ ...t, devices: [] }));
  const other = { label: 'Other', hint: '', devices: [] };
  devices.forEach((d) => {
    let idx = -1;
    if (product.tierBy === 'field') {
      idx = tiers.findIndex((t) => t.values?.includes(d[product.tierField]));
    } else {
      const n = modelNumber(d.model);
      idx = tiers.findIndex((t) => n <= t.max);
    }
    (idx >= 0 ? buckets[idx] : other).devices.push(d);
  });
  if (other.devices.length) buckets.push(other);
  return buckets.filter((b) => b.devices.length);
};

export const PRODUCT_TYPES = {
  firewall: {
    key: 'firewall',
    label: 'Firewall',
    apiType: 'firewall',
    rfpLabel: 'Firewall',
    fileTag: 'FortiGate',
    sortOptions: [
      { label: 'Firewall throughput', key: 'firewall_throughput_1518_gbps' },
      { label: 'Threat protection', key: 'threat_protection_gbps' },
      { label: 'IPS throughput', key: 'ips_throughput_gbps' },
      { label: 'Concurrent sessions', key: 'concurrent_sessions' },
      { label: 'Model name', key: 'model', text: true },
    ],
    tierBy: 'modelNumber',
    tiers: [
      { label: 'Entry / Branch', hint: 'FG-30G – FG-90G', max: 99 },
      { label: 'Mid-range', hint: 'FG-100F – FG-200G', max: 399 },
      { label: 'Enterprise', hint: 'FG-400F – FG-900G', max: 999 },
      { label: 'Data Center', hint: 'FG-1000F and above', max: Infinity },
    ],
    cardSpecs: [
      { label: 'IPS', key: 'ips_throughput_gbps', unit: 'Gbps' },
      { label: 'NGFW', key: 'ngfw_throughput_gbps', unit: 'Gbps' },
    ],
    detailGroups: [
      { title: 'Firewall Throughput', icon: 'Zap', rows: [
        { label: '1518 byte packets', key: 'firewall_throughput_1518_gbps', unit: 'Gbps' },
        { label: '512 byte packets', key: 'firewall_throughput_512_gbps', unit: 'Gbps' },
        { label: '64 byte packets', key: 'firewall_throughput_64_gbps', unit: 'Gbps' },
        { label: 'Latency (64 byte UDP)', key: 'firewall_latency_us', unit: 'µs' },
        { label: 'Packets/sec', key: 'firewall_throughput_mpps', unit: 'Mpps' },
      ]},
      { title: 'Security Performance', icon: 'Shield', rows: [
        { label: 'IPS Throughput', key: 'ips_throughput_gbps', unit: 'Gbps' },
        { label: 'NGFW Throughput', key: 'ngfw_throughput_gbps', unit: 'Gbps' },
        { label: 'Threat Protection', key: 'threat_protection_gbps', unit: 'Gbps' },
        { label: 'SSL Inspection Throughput', key: 'ssl_inspection_throughput_gbps', unit: 'Gbps' },
        { label: 'SSL Insp. CPS', key: 'ssl_inspection_cps', count: true },
        { label: 'SSL Insp. Concurrent Sessions', key: 'ssl_inspection_concurrent_sessions', count: true },
      ]},
      { title: 'VPN', icon: 'Wifi', rows: [
        { label: 'IPsec VPN Throughput', key: 'ipsec_vpn_throughput_gbps', unit: 'Gbps' },
        { label: 'Gateway-to-Gateway Tunnels', key: 'gateway_to_gateway_vpn', count: true },
        { label: 'Client-to-Gateway Tunnels', key: 'client_to_gateway_tunnels', count: true },
      ]},
      { title: 'Sessions & Virtualization', icon: 'HardDrive', rows: [
        { label: 'Concurrent Sessions', key: 'concurrent_sessions', count: true },
        { label: 'New Sessions/sec', key: 'new_sessions_per_sec', count: true },
        { label: 'Virtual Domains (Default)', key: 'virtual_systems_default' },
        { label: 'Virtual Domains (Max)', key: 'virtual_systems_max' },
      ]},
      { title: 'Interfaces', icon: 'Network', rows: [
        { label: 'GE RJ45 Ports', key: 'ge_rj45_ports' },
        { label: 'WAN Ports', key: 'wan_ports' },
        { label: 'FortiLink Port', key: 'fortilink_ports' },
        { label: 'Console Port (RJ45)', key: 'console_ports' },
        { label: 'USB Port', key: 'usb_ports' },
      ]},
    ],
    comparisonSpecs: [
      { label: 'Firewall Throughput', key: 'firewall_throughput_1518_gbps', unit: 'Gbps' },
      { label: 'NGFW Throughput', key: 'ngfw_throughput_gbps', unit: 'Gbps' },
      { label: 'Threat Protection Throughput', key: 'threat_protection_gbps', unit: 'Gbps' },
      { label: 'IPS Throughput', key: 'ips_throughput_gbps', unit: 'Gbps' },
      { label: 'IPsec VPN Throughput', key: 'ipsec_vpn_throughput_gbps', unit: 'Gbps' },
      { label: 'SSL Inspection Throughput', key: 'ssl_inspection_throughput_gbps', unit: 'Gbps' },
      { label: 'Concurrent Sessions (TCP)', key: 'concurrent_sessions', count: true },
      { label: 'New Session/Second (TCP)', key: 'new_sessions_per_sec', count: true },
      { label: 'Gateway-to-Gateway Tunnels', key: 'gateway_to_gateway_vpn', count: true },
      { label: 'Client-to-Gateway Tunnels', key: 'client_to_gateway_tunnels', count: true },
      { label: 'Virtual Domains (Max)', key: 'virtual_systems_max', count: true },
    ],
    // Numeric fields the user can set a customer requirement against.
    requirementSpecs: [
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
    ],
    // RFP "Technical specification" cell — order matches the company template.
    rfpSpecs: [
      { label: 'IPS Throughput', key: 'ips_throughput_gbps', unit: 'Gbps' },
      { label: 'NGFW Throughput', key: 'ngfw_throughput_gbps', unit: 'Gbps' },
      { label: 'Threat Protection Throughput', key: 'threat_protection_gbps', unit: 'Gbps' },
      { label: 'Firewall Throughput (1518/512/64 byte)', keys: ['firewall_throughput_1518_gbps', 'firewall_throughput_512_gbps', 'firewall_throughput_64_gbps'], sep: ' / ', unit: 'Gbps' },
      { label: 'Firewall Latency (64 byte UDP)', key: 'firewall_latency_us', unit: 'µs' },
      { label: 'Firewall Throughput (Packets Per Second)', key: 'firewall_throughput_mpps', unit: 'Mpps' },
      { label: 'Concurrent Sessions (TCP)', key: 'concurrent_sessions', count: true },
      { label: 'New Sessions/Second (TCP)', key: 'new_sessions_per_sec', count: true },
      { label: 'IPsec VPN Throughput (512 byte)', key: 'ipsec_vpn_throughput_gbps', unit: 'Gbps' },
      { label: 'Gateway-to-Gateway IPsec Tunnels', key: 'gateway_to_gateway_vpn', count: true },
      { label: 'Client-to-Gateway IPsec Tunnels', key: 'client_to_gateway_tunnels', count: true },
      { label: 'SSL Inspection Throughput (IPS, avg. HTTPS)', key: 'ssl_inspection_throughput_gbps', unit: 'Gbps' },
      { label: 'SSL Inspection CPS (IPS, avg. HTTPS)', key: 'ssl_inspection_cps', count: true },
      { label: 'SSL Inspection Concurrent Sessions (IPS, avg. HTTPS)', key: 'ssl_inspection_concurrent_sessions', count: true },
      { label: 'Virtual Domains (Default / Maximum)', keys: ['virtual_systems_default', 'virtual_systems_max'], sep: ' / ' },
      { label: 'Hardware Accelerated GE WAN Ports', key: 'wan_ports' },
      { label: 'Hardware Accelerated GE RJ45 Ports', key: 'ge_rj45_ports' },
      { label: 'GE RJ45 FortiLink Port (Default)', key: 'fortilink_ports' },
      { label: 'Console Port (RJ45)', key: 'console_ports' },
      { label: 'USB Port', key: 'usb_ports' },
    ],
  },

  switch: {
    key: 'switch',
    label: 'Switch',
    apiType: 'switch',
    rfpLabel: 'Switch',
    fileTag: 'FortiSwitch',
    sortOptions: [
      { label: 'Switching capacity', key: 'switching_capacity_gbps' },
      { label: 'Total ports', sum: ['ge_ports', 'mugig_ports', 'sfp_ports', 'sfp+_ports', 'spf28_ports', 'qsfp+_ports', 'qsfp28_ports'] },
      { label: 'PoE budget', key: 'poe_budget' },
      { label: 'Throughput (PPS)', key: 'packets_per_s_mpps' },
      { label: 'Model name', key: 'model', text: true },
    ],
    tierBy: 'modelNumber',
    tiers: [
      { label: 'Secure Access', hint: '100 & 200 Series — branch and small office', max: 299 },
      { label: 'Campus', hint: '300, 400 & 600 Series — access and aggregation', max: 999 },
      { label: 'Core & Data Center', hint: '1000 Series and above', max: Infinity },
    ],
    cardSpecs: [
      { label: 'Capacity', key: 'switching_capacity_gbps', unit: 'Gbps' },
      { label: 'PPS', key: 'packets_per_s_mpps', unit: 'Mpps' },
    ],
    detailGroups: [
      { title: 'Performance & Capacity', icon: 'Zap', rows: [
        { label: 'Switching Capacity', key: 'switching_capacity_gbps', unit: 'Gbps' },
        { label: 'Throughput (PPS)', key: 'packets_per_s_mpps', unit: 'Mpps' },
        { label: 'Network Latency', key: 'network_latency_us', unit: 'µs' },
        { label: 'MAC Address Storage', key: 'mac_add_storage', count: true },
        { label: 'VLANs Supported', key: 'vlans_support', count: true },
        { label: 'LAG Size', key: 'lag_size' },
        { label: 'ACL', key: 'acl', count: true },
        { label: 'STP Instances', key: 'stp_instance' },
      ]},
      { title: 'Interfaces', icon: 'Network', rows: [
        { label: 'GE Ports', key: 'ge_ports' },
        { label: 'MultiGig Ports', key: 'mugig_ports' },
        { label: 'SFP Ports', key: 'sfp_ports' },
        { label: 'SFP+ Ports', key: 'sfp+_ports' },
        { label: 'SFP28 Ports', key: 'spf28_ports' },
        { label: 'QSFP+ Ports', key: 'qsfp+_ports' },
        { label: 'QSFP28 Ports', key: 'qsfp28_ports' },
        { label: 'PoE Ports', key: 'poe_ports' },
        { label: 'Mgmt Port', key: 'mgmt_port' },
        { label: 'Console Port', key: 'console_port' },
      ]},
      { title: 'Power', icon: 'HardDrive', rows: [
        { label: 'PoE Budget', key: 'poe_budget', unit: 'W' },
        { label: 'Max Power Draw', key: 'pwr_consumed_max_w', unit: 'W' },
        { label: 'Heat Dissipation', key: 'heat_diss_btuh', unit: 'BTU/h' },
      ]},
      { title: 'Lifecycle', icon: 'FileText', rows: [
        { label: 'MTBF', key: 'mtbf_years', unit: 'years' },
        { label: 'Release Year', key: 'release_year' },
        { label: 'Support Years', key: 'support_years' },
      ]},
    ],
    comparisonSpecs: [
      { label: 'Switching Capacity', key: 'switching_capacity_gbps', unit: 'Gbps' },
      { label: 'Throughput (PPS)', key: 'packets_per_s_mpps', unit: 'Mpps' },
      { label: 'Network Latency', key: 'network_latency_us', unit: 'µs' },
      { label: 'MAC Address Storage', key: 'mac_add_storage', count: true },
      { label: 'VLANs Supported', key: 'vlans_support', count: true },
      { label: 'PoE Budget', key: 'poe_budget', unit: 'W' },
      { label: 'GE Ports', key: 'ge_ports' },
      { label: 'SFP+ Ports', key: 'sfp+_ports' },
      { label: 'QSFP28 Ports', key: 'qsfp28_ports' },
      { label: 'MTBF', key: 'mtbf_years', unit: 'years' },
    ],
    requirementSpecs: [
      { key: 'switching_capacity_gbps', label: 'Switching Capacity (Gbps)', placeholder: 'e.g., 128' },
      { key: 'packets_per_s_mpps', label: 'Throughput (Mpps)', placeholder: 'e.g., 190' },
      { key: 'poe_budget', label: 'PoE Budget (W)', placeholder: 'e.g., 370' },
      { key: 'poe_ports', label: 'PoE Ports', placeholder: 'e.g., 24' },
      { key: 'ge_ports', label: 'GE RJ45 Ports', placeholder: 'e.g., 48' },
      { key: 'mugig_ports', label: 'MultiGig Ports', placeholder: 'e.g., 24' },
      { key: 'sfp+_ports', label: 'SFP+ Ports', placeholder: 'e.g., 4' },
      { key: 'qsfp28_ports', label: 'QSFP28 Ports', placeholder: 'e.g., 2' },
      { key: 'mac_add_storage', label: 'MAC Address Storage', placeholder: 'e.g., 16000' },
      { key: 'vlans_support', label: 'VLANs Supported', placeholder: 'e.g., 4000' },
    ],
    // Placeholder RFP list (curated). Replace with the exact list when provided.
    rfpSpecs: [
      { label: 'Switching Capacity', key: 'switching_capacity_gbps', unit: 'Gbps' },
      { label: 'Throughput (Packets Per Second)', key: 'packets_per_s_mpps', unit: 'Mpps' },
      { label: 'Network Latency', key: 'network_latency_us', unit: 'µs' },
      { label: 'MAC Address Storage', key: 'mac_add_storage', count: true },
      { label: 'VLANs Supported', key: 'vlans_support', count: true },
      { label: 'LAG Size', key: 'lag_size' },
      { label: 'ACL', key: 'acl', count: true },
      { label: 'STP Instances', key: 'stp_instance' },
      { label: 'PoE Budget', key: 'poe_budget', unit: 'W' },
      { label: 'GE RJ45 Ports', key: 'ge_ports' },
      { label: 'MultiGig Ports', key: 'mugig_ports' },
      { label: 'SFP Ports', key: 'sfp_ports' },
      { label: 'SFP+ Ports', key: 'sfp+_ports' },
      { label: 'SFP28 Ports', key: 'spf28_ports' },
      { label: 'QSFP+ Ports', key: 'qsfp+_ports' },
      { label: 'QSFP28 Ports', key: 'qsfp28_ports' },
      { label: 'PoE Ports', key: 'poe_ports' },
      { label: 'Management Port', key: 'mgmt_port' },
      { label: 'Console Port', key: 'console_port' },
    ],
  },

  ap: {
    key: 'ap',
    label: 'Access Point',
    apiType: 'ap',
    rfpLabel: 'Access Point',
    fileTag: 'FortiAP',
    sortOptions: [
      { label: 'Max PHY rate (all bands)', sum: ['max_phy_band_2.4ghz_gbps', 'max_phy_band_5ghz_gbps', 'max_phy_band_6ghz_gbps'] },
      { label: 'Client capacity / radio', key: 'client_cap_p_radio' },
      { label: 'Max power draw', key: 'pwr_consumption_max_w' },
      { label: 'Model name', key: 'model', text: true },
    ],
    // APs don't tier by model number (23JK would land below 221K) — split by deployment type.
    tierBy: 'field',
    tierField: 'type',
    tiers: [
      { label: 'Indoor', hint: 'Ceiling and wall mounted', values: ['Indoor AP'] },
      { label: 'Wall plate & desktop', hint: 'Room and desk units', values: ['Indoor AP (wall/desk)'] },
      { label: 'Outdoor', hint: 'Weatherproof and long range', values: ['Outdoor AP'] },
    ],
    cardSpecs: [
      { label: 'Standard', key: 'standard' },
      { label: '5GHz', key: 'max_phy_band_5ghz_gbps', unit: 'Gbps' },
    ],
    detailGroups: [
      { title: 'Radio', icon: 'Wifi', rows: [
        { label: 'Wi-Fi Standard', key: 'standard' },
        { label: 'Type', key: 'type' },
        { label: 'Frequency Bands', key: 'frequency_bands' },
        { label: 'Radios', key: 'no_of_radios' },
        { label: 'Max PHY 2.4GHz', key: 'max_phy_band_2.4ghz_gbps', unit: 'Gbps' },
        { label: 'Max PHY 5GHz', key: 'max_phy_band_5ghz_gbps', unit: 'Gbps' },
        { label: 'Max PHY 6GHz', key: 'max_phy_band_6ghz_gbps', unit: 'Gbps' },
        { label: 'Max SSIDs', key: 'max_ssids' },
        { label: 'Spatial Streams', key: 'spatial_stream' },
        { label: 'Client Capacity / Radio', key: 'client_cap_p_radio' },
      ]},
      { title: 'Antenna', icon: 'Shield', rows: [
        { label: 'Antenna Type', key: 'antenna_type' },
        { label: 'Gain 2.4GHz', key: 'antenna_gain_2.4_dbi', unit: 'dBi' },
        { label: 'Gain 5GHz', key: 'antenna_gain_5_dbi', unit: 'dBi' },
        { label: 'Gain 6GHz', key: 'antenna_gain_6_dbi', unit: 'dBi' },
      ]},
      { title: 'Interfaces & Power', icon: 'Network', rows: [
        { label: 'MultiGig Ports', key: 'mugig_ports' },
        { label: 'GE Ports', key: 'ge_ports' },
        { label: 'PoE', key: 'poe' },
        { label: 'USB Ports', key: 'usb_ports' },
        { label: 'Console Port', key: 'console_port' },
        { label: 'Max Power Draw', key: 'pwr_consumption_max_w', unit: 'W' },
      ]},
      { title: 'Lifecycle', icon: 'FileText', rows: [
        { label: 'MTBF', key: 'mtbf_years', unit: 'years' },
        { label: 'Warranty', key: 'warranty' },
        { label: 'Release Year', key: 'release_year' },
        { label: 'Support Years', key: 'support_years' },
      ]},
    ],
    comparisonSpecs: [
      { label: 'Wi-Fi Standard', key: 'standard' },
      { label: 'Frequency Bands', key: 'frequency_bands' },
      { label: 'Radios', key: 'no_of_radios' },
      { label: 'Max PHY 5GHz', key: 'max_phy_band_5ghz_gbps', unit: 'Gbps' },
      { label: 'Max PHY 6GHz', key: 'max_phy_band_6ghz_gbps', unit: 'Gbps' },
      { label: 'Max SSIDs', key: 'max_ssids' },
      { label: 'Spatial Streams', key: 'spatial_stream' },
      { label: 'Client Capacity / Radio', key: 'client_cap_p_radio' },
      { label: 'MultiGig Ports', key: 'mugig_ports' },
      { label: 'MTBF', key: 'mtbf_years', unit: 'years' },
    ],
    // APs are mostly text specs; only these few are meaningfully numeric.
    requirementSpecs: [
      { key: 'max_phy_band_5ghz_gbps', label: 'Max PHY Rate 5GHz (Gbps)', placeholder: 'e.g., 2.88' },
      { key: 'max_phy_band_6ghz_gbps', label: 'Max PHY Rate 6GHz (Gbps)', placeholder: 'e.g., 5.76' },
      { key: 'client_cap_p_radio', label: 'Client Capacity per Radio', placeholder: 'e.g., 256' },
      { key: 'max_ssids', label: 'Max SSIDs', placeholder: 'e.g., 8' },
      { key: 'mugig_ports', label: 'MultiGig Ethernet Ports', placeholder: 'e.g., 1' },
    ],
    // Placeholder RFP list (curated). Replace with the exact list when provided.
    rfpSpecs: [
      { label: 'Wi-Fi Standard', key: 'standard' },
      { label: 'Type', key: 'type' },
      { label: 'Frequency Bands', key: 'frequency_bands' },
      { label: 'Number of Radios', key: 'no_of_radios' },
      { label: 'Max PHY Rate 2.4GHz', key: 'max_phy_band_2.4ghz_gbps', unit: 'Gbps' },
      { label: 'Max PHY Rate 5GHz', key: 'max_phy_band_5ghz_gbps', unit: 'Gbps' },
      { label: 'Max PHY Rate 6GHz', key: 'max_phy_band_6ghz_gbps', unit: 'Gbps' },
      { label: 'Max SSIDs', key: 'max_ssids' },
      { label: 'Spatial Streams', key: 'spatial_stream' },
      { label: 'Client Capacity per Radio', key: 'client_cap_p_radio' },
      { label: 'Antenna Type', key: 'antenna_type' },
      { label: 'Antenna Gain (2.4 / 5 / 6 GHz)', keys: ['antenna_gain_2.4_dbi', 'antenna_gain_5_dbi', 'antenna_gain_6_dbi'], sep: ' / ', unit: 'dBi' },
      { label: 'MultiGig Ethernet Ports', key: 'mugig_ports' },
      { label: 'GE Ports', key: 'ge_ports' },
      { label: 'PoE', key: 'poe' },
      { label: 'USB Port', key: 'usb_ports' },
      { label: 'Console Port', key: 'console_port' },
    ],
  },
};

export const PRODUCT_ORDER = ['firewall', 'switch', 'ap'];
