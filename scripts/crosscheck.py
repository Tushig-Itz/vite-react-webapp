# -*- coding: utf-8 -*-
"""Independent check: parse interface_raw, sum max port speeds, compare with
   switching_capacity_gbps (Fortinet quotes duplex = 2x line rate)."""
import csv, re, sys
SPEED = {'100M':0.1,'10M':0.01,'1G':1,'1GE':1,'GE':1,'2.5G':2.5,'2.5GE':2.5,'5G':5,'5GE':5,
         '10G':10,'10GE':10,'25G':25,'25GE':25,'40G':40,'40GE':40,'100G':100,'100GE':100}
TOK = re.compile(r'(\d+(?:\.\d+)?G[E]?|100M|10M|\bGE\b)')
rows = list(csv.DictReader(open(sys.argv[1], encoding='utf-8-sig')))
bad = 0
for r in rows:
    raw, cap = r['interface_raw'], r['switching_capacity_gbps']
    if not raw or not cap: continue
    total = 0; parsed = []
    for seg in re.split(r',| and ', raw):
        m = re.search(r'(\d+)\s*x\s*(.+)', seg.strip(), re.I)
        if not m: continue
        n = int(m.group(1))
        speeds = [SPEED[t.upper()] for t in TOK.findall(m.group(2)) if t.upper() in SPEED]
        if not speeds: continue
        total += n * max(speeds); parsed.append(f'{n}x{max(speeds)}G')
    if not total: continue
    exp = total * 2
    ok = abs(exp - float(cap)) < 0.05 * float(cap)
    if not ok:
        bad += 1
        print(f'  MISMATCH {r["model"]:<12} stated {cap} Gbps vs ports {" + ".join(parsed)} = {exp} Gbps')
print(f'\n{len(rows)} rows checked, {bad} capacity mismatches')
