import ExcelJS from 'exceljs';

export const exportDeviceToExcel = async (device, formatNumber) => {
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

        // rows
        const addRow = (label, customer = '', value, useFormula = false) => {
            const row = worksheet.addRow([label, customer, value || 'N/A', '']);
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

            if (useFormula) {
                row.getCell(4).value = {
                    formula: `=IF(OR(B${rowNum}="",ISBLANK(B${rowNum})),"",IF(IFERROR(VALUE(LEFT(TRIM(C${rowNum}),FIND(" ",TRIM(C${rowNum})&" ")-1)),0)>IFERROR(VALUE(LEFT(TRIM(B${rowNum}),FIND(" ",TRIM(B${rowNum})&" ")-1)),0),"More",IF(IFERROR(VALUE(LEFT(TRIM(C${rowNum}),FIND(" ",TRIM(C${rowNum})&" ")-1)),0)=IFERROR(VALUE(LEFT(TRIM(B${rowNum}),FIND(" ",TRIM(B${rowNum})&" ")-1)),0),"Same","Less")))`
                };
            }
        };

        // raw interface row
        if (device.interface_raw) {
            const intRow = worksheet.addRow(['Interface', '', device.interface_raw, '']);
            intRow.height = 60;
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

        // specs
        addRow('Firewall Throughput', '', device.firewall_throughput_1518_gbps ? `${device.firewall_throughput_1518_gbps} Gbps` : 'N/A', true);
        addRow('NGFW Throughput', '', device.ngfw_throughput_gbps ? `${device.ngfw_throughput_gbps} Gbps` : 'N/A', true);
        addRow('Threat Protection Throughput', '', device.threat_protection_gbps ? `${device.threat_protection_gbps} Gbps` : 'N/A', true);
        addRow('Concurrent Sessions (TCP)', '', formatNumber(device.concurrent_sessions), true);
        addRow('New Session/Second (TCP)', '', formatNumber(device.new_sessions_per_sec), true);
        addRow('IPS Throughput', '', device.ips_throughput_gbps ? `${device.ips_throughput_gbps} Gbps` : 'N/A', true);
        addRow('AV Throughput', '', device.av_throughput_gbps ? `${device.av_throughput_gbps} Gbps` : 'N/A', true);
        addRow('IPsec VPN Throughput', '', device.ipsec_vpn_throughput_gbps ? `${device.ipsec_vpn_throughput_gbps} Gbps` : 'N/A', true);
        addRow('SSL Proxy Throughput', '', device.ssl_proxy_throughput_gbps ? `${device.ssl_proxy_throughput_gbps} Gbps` : 'N/A', true);
        addRow('Virtual Systems (Max)', '', `${device.virtual_systems_max || 0}`, true);
        addRow('SSL VPN Users (Max)', '', device.ssl_vpn_users_max ? `${device.ssl_vpn_users_max}` : 'N/A', true);
        addRow('Gateway-to-Gateway VPN', '', device.gateway_to_gateway_vpn || 'N/A', true);
        addRow('Firewall Policy', '', formatNumber(device.firewall_policy_max), true);

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
        link.download = `FortiGate_${device.model}_${timestamp}.xlsx`;

        link.click();
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Export error:', error);
        throw error;
    }
};