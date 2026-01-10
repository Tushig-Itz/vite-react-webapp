import ExcelJS from 'exceljs';

// RFP comparison
export const exportSingleWithRFP = async (device, formatNumber, rfpRequirements = {}) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(device.model);

        // column widths
        worksheet.columns = [
            { width: 30 },
            { width: 25 },
            { width: 25 },
            { width: 15 }
        ];

        // title
        const titleRow = worksheet.addRow(['FortiGate Comparison Sheet']);
        titleRow.font = { size: 16, bold: true, color: { argb: 'FF2563EB' } };
        titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.mergeCells('A1:D1');
        worksheet.addRow([]);

        // header 
        const headerRow = worksheet.addRow(['Үзүүлэлтүүд', 'Харилцагчийн үзүүлэлт', device.model, 'Харьцуулалт']);
        headerRow.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

        for (let i = 1; i <= 4; i++) {
            headerRow.getCell(i).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF3B82F6' }
            };
            headerRow.getCell(i).border = {
                top: { style: 'thin' },
                bottom: { style: 'thick' },
                left: { style: 'thin' },
                right: { style: 'thin' }
            };
        }

        // rfp row
        const addRow = (label, rfpKey, value, unit = '', useFormula = false) => {
            const customerValue = rfpRequirements[rfpKey] || '';
            const displayCustomerValue = customerValue ? `${customerValue}${unit ? ' ' + unit : ''}` : '';
            const displayDeviceValue = value || 'N/A';
            
            const row = worksheet.addRow([label, displayCustomerValue, displayDeviceValue, '']);
            const rowNum = row.number;
            row.font = { size: 11 };
            row.height = 25;

            for (let i = 1; i <= 4; i++) {
                row.getCell(i).border = {
                    top: { style: 'thin' },
                    bottom: { style: 'thin' },
                    left: { style: 'thin' },
                    right: { style: 'thin' }
                };
            }

            row.getCell(1).font = { size: 11, color: { argb: 'FF6B7280' } };
            row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
            row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
            row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };

            if (useFormula && customerValue) {
                row.getCell(4).value = {
                    formula: `=IF(OR(B${rowNum}="",ISBLANK(B${rowNum})),"",IF(IFERROR(VALUE(LEFT(TRIM(C${rowNum}),FIND(" ",TRIM(C${rowNum})&" ")-1)),0)>IFERROR(VALUE(LEFT(TRIM(B${rowNum}),FIND(" ",TRIM(B${rowNum})&" ")-1)),0),"More",IF(IFERROR(VALUE(LEFT(TRIM(C${rowNum}),FIND(" ",TRIM(C${rowNum})&" ")-1)),0)=IFERROR(VALUE(LEFT(TRIM(B${rowNum}),FIND(" ",TRIM(B${rowNum})&" ")-1)),0),"Same","Less")))`
                };
            }
        };

        // raw interface row
        if (device.interface_raw) {
            const intRow = worksheet.addRow(['Interface', '', device.interface_raw, '']);
            const lines = Math.ceil(device.interface_raw.length / 50);
            intRow.height = Math.max(40, lines * 15);
            intRow.getCell(1).alignment = { vertical: 'middle' };
            intRow.getCell(1).font = { size: 11, color: { argb: 'FF6B7280' } };
            intRow.getCell(3).alignment = { wrapText: true, vertical: 'top', horizontal: 'center' };
            for (let i = 1; i <= 4; i++) {
                intRow.getCell(i).border = {
                    top: { style: 'thin' },
                    bottom: { style: 'thin' },
                    left: { style: 'thin' },
                    right: { style: 'thin' }
                };
            }
        }

        // specs with RFP keys matching the modal
        addRow('Firewall Throughput', 'firewall_throughput_1518_gbps', 
            device.firewall_throughput_1518_gbps ? `${device.firewall_throughput_1518_gbps} Gbps` : 'N/A', 'Gbps', true);
        addRow('NGFW Throughput', 'ngfw_throughput_gbps', 
            device.ngfw_throughput_gbps ? `${device.ngfw_throughput_gbps} Gbps` : 'N/A', 'Gbps', true);
        addRow('Threat Protection Throughput', 'threat_protection_gbps', 
            device.threat_protection_gbps ? `${device.threat_protection_gbps} Gbps` : 'N/A', 'Gbps', true);
        addRow('Concurrent Sessions (TCP)', 'concurrent_sessions', 
            formatNumber(device.concurrent_sessions), '', true);
        addRow('New Session/Second (TCP)', 'new_sessions_per_sec', 
            formatNumber(device.new_sessions_per_sec), '', true);
        addRow('IPS Throughput', 'ips_throughput_gbps', 
            device.ips_throughput_gbps ? `${device.ips_throughput_gbps} Gbps` : 'N/A', 'Gbps', true);
        addRow('AV Throughput', 'av_throughput_gbps', 
            device.av_throughput_gbps ? `${device.av_throughput_gbps} Gbps` : 'N/A', 'Gbps', true);
        addRow('IPsec VPN Throughput', 'ipsec_vpn_throughput_gbps', 
            device.ipsec_vpn_throughput_gbps ? `${device.ipsec_vpn_throughput_gbps} Gbps` : 'N/A', 'Gbps', true);
        addRow('SSL Proxy Throughput', 'ssl_proxy_throughput_gbps', 
            device.ssl_proxy_throughput_gbps ? `${device.ssl_proxy_throughput_gbps} Gbps` : 'N/A', 'Gbps', true);
        addRow('Virtual Systems (Max)', 'virtual_systems_max', 
            `${device.virtual_systems_max || 0}`, '', true);
        addRow('SSL VPN Users (Max)', 'ssl_vpn_users_max', 
            device.ssl_vpn_users_max ? `${device.ssl_vpn_users_max}` : 'N/A', '', true);
        addRow('Gateway-to-Gateway VPN', 'gateway_to_gateway_vpn', 
            device.gateway_to_gateway_vpn || 'N/A', '', true);
        addRow('Firewall Policy', 'firewall_policy_max', 
            formatNumber(device.firewall_policy_max), '', true);

        if (device.release_year) {
            addRow('Release Year', '', device.release_year);
        }
        if (device.support_years) {
            addRow('Support Years', '', `${device.support_years} years`);
        }

        // generate
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        const timestamp = new Date().toISOString().split('T')[0];
        link.download = `FortiGate_${device.model}_RFP_${timestamp}.xlsx`;

        link.click();
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Export error:', error);
        throw error;
    }
};

// models comparison
export const exportMultipleModels = async (devices, formatNumber) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Comparison');

        const columns = [{ width: 30 }]; // First column for spec names
        for (let i = 0; i < devices.length; i++) {
            columns.push({ width: 25 }); // One column per device
        }
        worksheet.columns = columns;

        const titleRow = worksheet.addRow(['FortiGate Comparison Sheet']);
        titleRow.font = { size: 16, bold: true, color: { argb: 'FF2563EB' } };
        titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.mergeCells(1, 1, 1, devices.length + 1);
        worksheet.addRow([]);

        const headerData = ['Үзүүлэлтүүд', ...devices.map(d => d.model)];
        const headerRow = worksheet.addRow(headerData);
        headerRow.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

        for (let i = 1; i <= devices.length + 1; i++) {
            headerRow.getCell(i).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF3B82F6' }
            };
            headerRow.getCell(i).border = {
                top: { style: 'thin' },
                bottom: { style: 'thick' },
                left: { style: 'thin' },
                right: { style: 'thin' }
            };
        }

        // row
        const addComparisonRow = (label, getValue) => {
            const rowData = [label, ...devices.map(device => getValue(device) || 'N/A')];
            const row = worksheet.addRow(rowData);
            row.font = { size: 11 };
            row.height = 25;

            for (let i = 1; i <= devices.length + 1; i++) {
                row.getCell(i).border = {
                    top: { style: 'thin' },
                    bottom: { style: 'thin' },
                    left: { style: 'thin' },
                    right: { style: 'thin' }
                };
                if (i === 1) {
                    row.getCell(i).font = { size: 11, color: { argb: 'FF6B7280' } };
                } else {
                    row.getCell(i).alignment = { horizontal: 'center', vertical: 'middle' };
                }
            }
        };

        const interfaceData = ['Interface', ...devices.map(d => d.interface_raw || 'N/A')];
        const intRow = worksheet.addRow(interfaceData);

        const maxLength = Math.max(...devices.map(d => (d.interface_raw || '').length));
        const lines = Math.ceil(maxLength / 50);
        intRow.height = Math.max(40, lines * 15);
        
        intRow.getCell(1).alignment = { vertical: 'middle' };
        intRow.getCell(1).font = { size: 11, color: { argb: 'FF6B7280' } };
        
        for (let i = 2; i <= devices.length + 1; i++) {
            intRow.getCell(i).alignment = { wrapText: true, vertical: 'top', horizontal: 'center' };
            intRow.getCell(i).border = {
                top: { style: 'thin' },
                bottom: { style: 'thin' },
                left: { style: 'thin' },
                right: { style: 'thin' }
            };
        }
        intRow.getCell(1).border = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
        };

        // add specs
        addComparisonRow('Firewall Throughput', d => 
            d.firewall_throughput_1518_gbps ? `${d.firewall_throughput_1518_gbps} Gbps` : 'N/A');
        addComparisonRow('NGFW Throughput', d => 
            d.ngfw_throughput_gbps ? `${d.ngfw_throughput_gbps} Gbps` : 'N/A');
        addComparisonRow('Threat Protection Throughput', d => 
            d.threat_protection_gbps ? `${d.threat_protection_gbps} Gbps` : 'N/A');
        addComparisonRow('Concurrent Sessions (TCP)', d => 
            formatNumber(d.concurrent_sessions));
        addComparisonRow('New Session/Second (TCP)', d => 
            formatNumber(d.new_sessions_per_sec));
        addComparisonRow('IPS Throughput', d => 
            d.ips_throughput_gbps ? `${d.ips_throughput_gbps} Gbps` : 'N/A');
        addComparisonRow('AV Throughput', d => 
            d.av_throughput_gbps ? `${d.av_throughput_gbps} Gbps` : 'N/A');
        addComparisonRow('IPsec VPN Throughput', d => 
            d.ipsec_vpn_throughput_gbps ? `${d.ipsec_vpn_throughput_gbps} Gbps` : 'N/A');
        addComparisonRow('SSL Proxy Throughput', d => 
            d.ssl_proxy_throughput_gbps ? `${d.ssl_proxy_throughput_gbps} Gbps` : 'N/A');
        addComparisonRow('Virtual Systems (Max)', d => 
            `${d.virtual_systems_max || 0}`);
        addComparisonRow('SSL VPN Users (Max)', d => 
            d.ssl_vpn_users_max ? `${d.ssl_vpn_users_max}` : 'N/A');
        addComparisonRow('Gateway-to-Gateway VPN', d => 
            d.gateway_to_gateway_vpn || 'N/A');
        addComparisonRow('Firewall Policy', d => 
            formatNumber(d.firewall_policy_max));

        if (devices.some(d => d.release_year)) {
            addComparisonRow('Release Year', d => d.release_year || 'N/A');
        }
        if (devices.some(d => d.support_years)) {
            addComparisonRow('Support Years', d => 
                d.support_years ? `${d.support_years} years` : 'N/A');
        }

        // generate
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        const timestamp = new Date().toISOString().split('T')[0];
        link.download = `FortiGate_Comparison_${timestamp}.xlsx`;

        link.click();
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Export error:', error);
        throw error;
    }
};
export const exportDeviceToExcel = async (device, formatNumber) => {
    return exportSingleWithRFP(device, formatNumber, {});
};