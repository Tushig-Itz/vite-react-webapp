# -*- coding: utf-8 -*-
import csv, re, sys
SW_TYPES = {  # mirrors SWITCH_TYPES in scripts/build-db.js
 'vendor':'text','family':'text','model':'text','series':'text','mtbf_years':'int',
 'switching_capacity_gbps':'real','packets_per_s_mpps':'real','mac_add_storage':'int',
 'network_latency_us':'real','vlans_support':'int','lag_size':'int','dram':'text','flash_mem':'text',
 'storage_gb':'int','acl':'int','stp_instance':'int','dimentions_h_d_w_mm':'text','weight_kg':'real',
 'pwr_supply':'text','pwr_required':'text','pwr_consumed_avg_w':'real','pwr_consumed_max_w':'real',
 'heat_diss_btuh':'real','operating_temp':'text','strg_temp':'text','humidity':'text','air_flw':'text',
 'noise_lvl_dba':'real','certifications':'text','poe_budget':'int','mgmt_port':'int','console_port':'int',
 'poe_ports':'int','ge_ports':'int','mugig_ports':'int','sfp_ports':'int','sfp+_ports':'int',
 'spf28_ports':'int','qsfp+_ports':'int','qsfp28_ports':'int','interface_raw':'text',
 'release_year':'int','support_years':'int','datasheet_url':'text','datasheet_date':'text'}

path = sys.argv[1]
rows = list(csv.DictReader(open(path, encoding='utf-8-sig')))
errs, warns = [], []

for r in rows:
    m = r['model']
    for col, t in SW_TYPES.items():
        v = (r.get(col) or '').strip()
        if v == '': continue
        if t in ('int','real'):
            try:
                n = float(v)
                if t == 'int' and n != int(n): errs.append(f'{m}.{col}: non-integer INT "{v}"')
            except ValueError:
                errs.append(f'{m}.{col}: non-numeric {t.upper()} "{v}"')
    # port math vs switching capacity
    def i(c):
        v=(r.get(c) or '').strip(); return int(float(v)) if v else 0
    lanes = (i('ge_ports')*1 + i('mugig_ports')*10 + i('sfp_ports')*1 + i('sfp+_ports')*10
             + i('spf28_ports')*25 + i('qsfp+_ports')*40 + i('qsfp28_ports')*100)
    cap = (r.get('switching_capacity_gbps') or '').strip()
    if cap and lanes:
        cap = float(cap)
        if abs(cap - lanes*2) / cap > 0.12:
            warns.append(f'{m}: switching_capacity {cap} vs 2x port lanes {lanes*2} (delta {cap-lanes*2:+.0f})')
    # heat vs power
    hp, pw = (r.get('heat_diss_btuh') or '').strip(), (r.get('pwr_consumed_max_w') or '').strip()
    if hp and pw:
        exp = float(pw)*3.412
        if abs(float(hp)-exp)/max(exp,1) > 0.05:
            warns.append(f'{m}: heat {hp} BTU/h != max power {pw} W x3.412 = {exp:.0f} (PoE excluded?)')
    # avg > max
    av = (r.get('pwr_consumed_avg_w') or '').strip()
    if av and pw and float(av) > float(pw): warns.append(f'{m}: pwr avg {av} > max {pw}')
    # poe consistency
    if i('poe_ports') > 0 and i('poe_budget') == 0: warns.append(f'{m}: has {i("poe_ports")} PoE ports but poe_budget 0')
    if i('poe_budget') > 0 and i('poe_ports') == 0: warns.append(f'{m}: poe_budget {i("poe_budget")} but 0 PoE ports')
    if i('poe_ports') > i('ge_ports')+i('mugig_ports'):
        warns.append(f'{m}: poe_ports {i("poe_ports")} > copper ports {i("ge_ports")+i("mugig_ports")}')
    # placeholders / formats
    u = (r.get('datasheet_url') or '').strip()
    if u and not u.startswith('http'): errs.append(f'{m}.datasheet_url: placeholder "{u}"')
    d = (r.get('datasheet_date') or '').strip()
    if d and not re.match(r'^\d{4}-\d{2}-\d{2}$', d): errs.append(f'{m}.datasheet_date: not ISO "{d}"')
    if not (r.get('release_year') or '').strip(): warns.append(f'{m}: release_year missing')

print(f'--- {path}: {len(rows)} rows')
print('BLOCKING (build-db.js would fail / bad data):' if errs else 'BLOCKING: none')
for e in errs: print('  X', e)
print('\nWARNINGS:')
for w in warns: print('  !', w)
