import ExcelJS from 'exceljs';
import {
    GENERAL_REQUIREMENTS,
    GENERAL_REQUIREMENTS_LABEL,
} from './rfpBoilerplate.js';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const THIN_BORDER = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
};

// Header fill — matches the company baseline (Accent 1, Lighter 60% = theme 4 / 0.6 tint).
const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C6E7' } };

// Estimate wrapped line count for a cell so we can size rows with comfortable spacing.
const estimateLines = (text, charsPerLine = 88) => {
    if (!text) return 1;
    return String(text).split('\n').reduce(
        (sum, seg) => sum + Math.max(1, Math.ceil(seg.length / charsPerLine)),
        0
    );
};

// Format a number with thousands separators; returns '' for empty values.
const fmtNum = (formatNumber, v) => {
    if (v === null || v === undefined || v === '') return '';
    const r = formatNumber(v);
    return r === 'N/A' ? '' : r;
};

const has = (v) => v !== null && v !== undefined && String(v).trim() !== '';

// ---------------------------------------------------------------------------
// Company RFP template spec lines (order MUST match the company template)
// ---------------------------------------------------------------------------
const buildRfpSpecLines = (device, formatNumber) => {
    const d = device;
    const g = (v, unit) => (has(v) ? `${v} ${unit}` : '');

    const fwCombined = () => {
        const a = d.firewall_throughput_1518_gbps;
        const b = d.firewall_throughput_512_gbps;
        const c = d.firewall_throughput_64_gbps;
        if (!has(a) && !has(b) && !has(c)) return '';
        return `${has(a) ? a : '-'} / ${has(b) ? b : '-'} / ${has(c) ? c : '-'} Gbps`;
    };

    const pair = (x, y) => {
        if (!has(x) && !has(y)) return '';
        return `${has(x) ? x : '-'} / ${has(y) ? y : '-'}`;
    };

    const lines = [
        ['IPS Throughput', g(d.ips_throughput_gbps, 'Gbps')],
        ['NGFW Throughput', g(d.ngfw_throughput_gbps, 'Gbps')],
        ['Threat Protection Throughput', g(d.threat_protection_gbps, 'Gbps')],
        ['Firewall Throughput (1518/512/64 byte)', fwCombined()],
        ['Firewall Latency (64 byte UDP)', g(d.firewall_latency_us, 'µs')],
        ['Firewall Throughput (Packets Per Second)', g(d.firewall_throughput_mpps, 'Mpps')],
        ['Concurrent Sessions (TCP)', fmtNum(formatNumber, d.concurrent_sessions)],
        ['New Sessions/Second (TCP)', fmtNum(formatNumber, d.new_sessions_per_sec)],
        ['IPsec VPN Throughput (512 byte)', g(d.ipsec_vpn_throughput_gbps, 'Gbps')],
        ['Gateway-to-Gateway IPsec Tunnels', fmtNum(formatNumber, d.gateway_to_gateway_vpn)],
        ['Client-to-Gateway IPsec Tunnels', fmtNum(formatNumber, d.client_to_gateway_tunnels)],
        ['SSL Inspection Throughput (IPS, avg. HTTPS)', g(d.ssl_inspection_throughput_gbps, 'Gbps')],
        ['SSL Inspection CPS (IPS, avg. HTTPS)', fmtNum(formatNumber, d.ssl_inspection_cps)],
        ['SSL Inspection Concurrent Sessions (IPS, avg. HTTPS)', fmtNum(formatNumber, d.ssl_inspection_concurrent_sessions)],
        ['Virtual Domains (Default / Maximum)', pair(d.virtual_systems_default, d.virtual_systems_max)],
        ['Hardware Accelerated GE WAN Ports', has(d.wan_ports) ? `${d.wan_ports}` : ''],
        ['Hardware Accelerated GE RJ45 Ports', has(d.ge_rj45_ports) ? `${d.ge_rj45_ports}` : ''],
        ['GE RJ45 FortiLink Port (Default)', has(d.fortilink_ports) ? `${d.fortilink_ports}` : ''],
        ['Console Port (RJ45)', has(d.console_ports) ? `${d.console_ports}` : ''],
        ['USB Port', has(d.usb_ports) ? `${d.usb_ports}` : ''],
    ];

    return lines.map(([label, value]) => `${label}:${value ? ' ' + value : ''}`).join('\n');
};

const triggerDownload = async (workbook, filename) => {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

// ---------------------------------------------------------------------------
// RFP Match Export — company template format
// ---------------------------------------------------------------------------
export const exportRfpMatch = async (device, formatNumber, rfpRequirements = {}, options = {}) => {
    try {
        const {
            quantity = '',
            label = 'Firewall',
            includeGeneralRequirements = true,
        } = options;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(device.model);

        // Column widths matching the company template
        worksheet.getColumn(1).width = 4.8;
        worksheet.getColumn(2).width = 12.2;
        worksheet.getColumn(3).width = 74.5;
        worksheet.getColumn(4).width = 8;

        // --- Header row (filled like the baseline; D1 has no fill or border) ---
        const headerRow = worksheet.addRow(['№', 'Description', 'Technical specification', '']);
        headerRow.font = { name: 'Arial', size: 10, bold: true };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        for (let i = 1; i <= 3; i++) {
            headerRow.getCell(i).border = THIN_BORDER;
            headerRow.getCell(i).fill = HEADER_FILL;
        }

        // --- Item 1: Ерөнхий шаардлага (general requirements) — baseline placeholder ---
        let itemNumber = 1;
        if (includeGeneralRequirements && GENERAL_REQUIREMENTS.length) {
            const firstReqRow = worksheet.rowCount + 1;
            GENERAL_REQUIREMENTS.forEach((reqText, i) => {
                const r = worksheet.addRow([i === 0 ? 1 : '', i === 0 ? GENERAL_REQUIREMENTS_LABEL : '', reqText, '']);
                r.height = estimateLines(reqText) * 16 + 20;
                for (let c = 1; c <= 3; c++) r.getCell(c).border = THIN_BORDER;
            });
            const lastReqRow = worksheet.rowCount;
            worksheet.mergeCells(`A${firstReqRow}:A${lastReqRow}`);
            worksheet.mergeCells(`B${firstReqRow}:B${lastReqRow}`);

            const grNum = worksheet.getCell(`A${firstReqRow}`);
            grNum.font = { name: 'Calibri', size: 11 };
            grNum.alignment = { horizontal: 'center', vertical: 'middle' };
            const grLabel = worksheet.getCell(`B${firstReqRow}`);
            grLabel.font = { name: 'Times New Roman', size: 9 };
            grLabel.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            for (let rr = firstReqRow; rr <= lastReqRow; rr++) {
                const cCell = worksheet.getCell(`C${rr}`);
                cCell.font = { name: 'Times New Roman', size: 9 };
                cCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 };
            }
            itemNumber = 2;
        }

        // --- Firewall block: two rows, A/B/C merged across both ---
        const specText = buildRfpSpecLines(device, formatNumber);

        const topRow = worksheet.addRow([itemNumber, label, specText, 'Qty']);
        const bottomRow = worksheet.addRow(['', '', '', quantity]);
        const topNum = topRow.number;
        const bottomNum = bottomRow.number;

        worksheet.mergeCells(`A${topNum}:A${bottomNum}`);
        worksheet.mergeCells(`B${topNum}:B${bottomNum}`);
        worksheet.mergeCells(`C${topNum}:C${bottomNum}`);

        const numCell = worksheet.getCell(`A${topNum}`);
        numCell.font = { name: 'Calibri', size: 11 };
        numCell.alignment = { horizontal: 'center', vertical: 'middle' };

        const descCell = worksheet.getCell(`B${topNum}`);
        descCell.font = { name: 'Times New Roman', size: 9 };
        descCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        const specCell = worksheet.getCell(`C${topNum}`);
        specCell.font = { name: 'Times New Roman', size: 9 };
        specCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

        const qtyLabelCell = worksheet.getCell(`D${topNum}`);
        qtyLabelCell.value = 'Qty';
        qtyLabelCell.font = { name: 'Calibri', size: 11 };
        qtyLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };
        const qtyValueCell = worksheet.getCell(`D${bottomNum}`);
        qtyValueCell.font = { name: 'Times New Roman', size: 9 };
        qtyValueCell.alignment = { horizontal: 'center', vertical: 'middle' };

        for (const r of [topNum, bottomNum]) {
            for (let i = 1; i <= 4; i++) worksheet.getRow(r).getCell(i).border = THIN_BORDER;
        }

        const lineCount = specText.split('\n').length;
        topRow.height = 14;
        bottomRow.height = Math.max(40, lineCount * 13);

        await triggerDownload(
            workbook,
            `RFP_${device.model}_${new Date().toISOString().split('T')[0]}.xlsx`
        );
    } catch (error) {
        console.error('Export error:', error);
        throw error;
    }
};

// ---------------------------------------------------------------------------
// Spec definitions shared by the comparison exports
// ---------------------------------------------------------------------------
const COMPARISON_SPECS = [
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
];

const specDisplayValue = (device, spec, formatNumber) => {
    const v = device[spec.key];
    if (!has(v)) return 'N/A';
    if (spec.count) return fmtNum(formatNumber, v) || 'N/A';
    return `${v} ${spec.unit}`;
};

// ---------------------------------------------------------------------------
// Mode 1: Single model with RFP comparison
// ---------------------------------------------------------------------------
export const exportSingleWithRFP = async (device, formatNumber, rfpRequirements = {}) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(device.model);

        worksheet.columns = [{ width: 32 }, { width: 25 }, { width: 25 }, { width: 15 }];

        const titleRow = worksheet.addRow(['FortiGate Comparison Sheet']);
        titleRow.font = { size: 16, bold: true, color: { argb: 'FF2563EB' } };
        titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.mergeCells('A1:D1');
        worksheet.addRow([]);

        const headerRow = worksheet.addRow(['Үзүүлэлтүүд', 'Харилцагчийн үзүүлэлт', device.model, 'Харьцуулалт']);
        headerRow.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
        for (let i = 1; i <= 4; i++) {
            headerRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
            headerRow.getCell(i).border = { ...THIN_BORDER, bottom: { style: 'thick' } };
        }

        const addRow = (spec) => {
            const customerValue = rfpRequirements[spec.key] || '';
            const displayCustomer = customerValue ? `${customerValue}${spec.unit ? ' ' + spec.unit : ''}` : '';
            const displayDevice = specDisplayValue(device, spec, formatNumber);

            const row = worksheet.addRow([spec.label, displayCustomer, displayDevice, '']);
            const rowNum = row.number;
            row.font = { size: 11 };
            row.height = 25;
            for (let i = 1; i <= 4; i++) row.getCell(i).border = THIN_BORDER;
            row.getCell(1).font = { size: 11, color: { argb: 'FF6B7280' } };
            for (let i = 2; i <= 4; i++) row.getCell(i).alignment = { horizontal: 'center', vertical: 'middle' };

            if (customerValue) {
                row.getCell(4).value = {
                    formula: `=IF(OR(B${rowNum}="",ISBLANK(B${rowNum})),"",IF(IFERROR(VALUE(LEFT(TRIM(C${rowNum}),FIND(" ",TRIM(C${rowNum})&" ")-1)),0)>IFERROR(VALUE(LEFT(TRIM(B${rowNum}),FIND(" ",TRIM(B${rowNum})&" ")-1)),0),"More",IF(IFERROR(VALUE(LEFT(TRIM(C${rowNum}),FIND(" ",TRIM(C${rowNum})&" ")-1)),0)=IFERROR(VALUE(LEFT(TRIM(B${rowNum}),FIND(" ",TRIM(B${rowNum})&" ")-1)),0),"Same","Less")))`,
                };
            }
        };

        if (device.interface_raw) {
            const intRow = worksheet.addRow(['Interface', '', device.interface_raw, '']);
            const lines = Math.ceil(device.interface_raw.length / 50);
            intRow.height = Math.max(40, lines * 15);
            intRow.getCell(1).alignment = { vertical: 'middle' };
            intRow.getCell(1).font = { size: 11, color: { argb: 'FF6B7280' } };
            intRow.getCell(3).alignment = { wrapText: true, vertical: 'top', horizontal: 'center' };
            for (let i = 1; i <= 4; i++) intRow.getCell(i).border = THIN_BORDER;
        }

        COMPARISON_SPECS.forEach(addRow);

        if (device.release_year) addRow({ label: 'Release Year', key: 'release_year' });
        if (device.support_years) addRow({ label: 'Support Years', key: 'support_years' });

        await triggerDownload(
            workbook,
            `FortiGate_${device.model}_RFP_${new Date().toISOString().split('T')[0]}.xlsx`
        );
    } catch (error) {
        console.error('Export error:', error);
        throw error;
    }
};

// ---------------------------------------------------------------------------
// Mode 2: Multiple models comparison (no RFP)
// ---------------------------------------------------------------------------
export const exportMultipleModels = async (devices, formatNumber) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Comparison');

        const columns = [{ width: 32 }];
        for (let i = 0; i < devices.length; i++) columns.push({ width: 25 });
        worksheet.columns = columns;

        const titleRow = worksheet.addRow(['FortiGate Comparison Sheet']);
        titleRow.font = { size: 16, bold: true, color: { argb: 'FF2563EB' } };
        titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.mergeCells(1, 1, 1, devices.length + 1);
        worksheet.addRow([]);

        const headerRow = worksheet.addRow(['Үзүүлэлтүүд', ...devices.map(d => d.model)]);
        headerRow.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
        for (let i = 1; i <= devices.length + 1; i++) {
            headerRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
            headerRow.getCell(i).border = { ...THIN_BORDER, bottom: { style: 'thick' } };
        }

        const addComparisonRow = (label, getValue) => {
            const row = worksheet.addRow([label, ...devices.map(d => getValue(d) || 'N/A')]);
            row.font = { size: 11 };
            row.height = 25;
            for (let i = 1; i <= devices.length + 1; i++) {
                row.getCell(i).border = THIN_BORDER;
                if (i === 1) row.getCell(i).font = { size: 11, color: { argb: 'FF6B7280' } };
                else row.getCell(i).alignment = { horizontal: 'center', vertical: 'middle' };
            }
        };

        const intRow = worksheet.addRow(['Interface', ...devices.map(d => d.interface_raw || 'N/A')]);
        const maxLength = Math.max(...devices.map(d => (d.interface_raw || '').length));
        intRow.height = Math.max(40, Math.ceil(maxLength / 50) * 15);
        intRow.getCell(1).alignment = { vertical: 'middle' };
        intRow.getCell(1).font = { size: 11, color: { argb: 'FF6B7280' } };
        for (let i = 1; i <= devices.length + 1; i++) {
            intRow.getCell(i).border = THIN_BORDER;
            if (i >= 2) intRow.getCell(i).alignment = { wrapText: true, vertical: 'top', horizontal: 'center' };
        }

        COMPARISON_SPECS.forEach(spec =>
            addComparisonRow(spec.label, d => specDisplayValue(d, spec, formatNumber))
        );

        if (devices.some(d => d.release_year)) {
            addComparisonRow('Release Year', d => d.release_year || 'N/A');
        }
        if (devices.some(d => d.support_years)) {
            addComparisonRow('Support Years', d => (d.support_years ? `${d.support_years} years` : 'N/A'));
        }

        await triggerDownload(
            workbook,
            `FortiGate_Comparison_${new Date().toISOString().split('T')[0]}.xlsx`
        );
    } catch (error) {
        console.error('Export error:', error);
        throw error;
    }
};

