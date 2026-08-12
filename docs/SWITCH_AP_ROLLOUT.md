# FortiSwitch / FortiAP rollout — merge, audit, and plan

Date: 2026-08-10
Sources verified this pass:

- [Fortinet Ethernet Switches product page](https://www.fortinet.com/products/ethernet-switches) — current lineup
- [Fortinet Wireless Access Points product page](https://www.fortinet.com/products/wireless-access-points) — current lineup
- [FortiSwitch Campus Core and Data Center Series datasheet](https://www.fortinet.com/content/dam/fortinet/assets/data-sheets/FortiSwitch_Data_Center_Series.pdf) (rev `FS-DC-DAT-R44-20260401`, April 1 2026) — full spec tables

---

## Part 1 — What changed

`fortiswitch_specs.xlsx` (15 rows, 14 distinct models) was merged into `fortiswitch_specs.csv`.
Result: **13 live rows**, 4 rows archived, 3 rows added. `npm run build` equivalent
(`import_data.py`) passes with zero type errors.

### Structural fixes

| Fix | Detail |
| --- | --- |
| Duplicate collapsed | `1048G` appeared twice. Row 1 matches the datasheet exactly; row 14 did not. Row 1 kept. |
| 17 empty placeholder rows | Removed (they were silently skipped by the builders anyway). |
| Model renamed | `T1024F` → `T1024F-FPOE` (the actual SKU; the non-PoE variant does not exist). |
| Model renamed (AP) | `441` → `441K`, series set to `K`. |
| Placeholder URLs | 5 rows had `datasheet link` as the URL. Replaced with the real PDF URL. |
| Date format | `datasheet_date` was `2026` on some rows, `2026-02-06` on others. Now ISO `YYYY-MM-DD` everywhere. |
| Encoding | En-dashes (`–`) in temps/voltages normalised to ASCII `-`. Only `°` remains non-ASCII. This is the CP1252 hazard called out in CLAUDE.md. |
| Excel artifacts | Numbers stored as text in rows 6–10 are now plain numerics. |

### Value corrections (all datasheet-verified)

| Model | Field | Was | Now |
| --- | --- | --- | --- |
| 1048G | `mac_add_storage` | 32000 | **64000** |
| 1048G | `dimentions_h_d_w_mm` | 43 x 460 x 438 | **43 x 460 x 438.5** |
| 1048G | `pwr_consumed_max_w` | 585 | **585.78** |
| 1048G | `heat_diss_btuh` | 2004 | **2004.3** |
| 1024E | `acl` | 18000 | **3000** |
| T1024E | `acl` | 18000 | **3000** |
| 1024E | `heat_diss_btuh` | 599 | **599.13** |
| T1024E | `heat_diss_btuh` | 436 | **436.48** |
| T1024F-FPOE | `humidity` | 10-90% | **10-95% RH non-condensing** |

### Port double-counting removed

The xlsx used two contradictory conventions. Combo ports (one physical cage, several
speeds) were counted in **every** applicable column on some rows and only once on others —
so `1024E` claimed 24 SFP *plus* 24 SFP+ for what is physically 24 ports.

**Convention now applied and to be kept: each physical port is counted once, in its
maximum-speed column.** Multi-speed capability lives in `interface_raw` only.

| Model | Was | Now |
| --- | --- | --- |
| 1024E | `sfp_ports` 24 + `sfp+_ports` 24 | `sfp_ports` 0, `sfp+_ports` 24 |
| T1024E | `ge_ports` 24 + `mugig_ports` 24 | `ge_ports` 0, `mugig_ports` 24 |
| T1024F-FPOE | `ge_ports` 24 + `mugig_ports` 24 | `ge_ports` 0, `mugig_ports` 24 |
| 1048E | `sfp_ports` 48 + `sfp+_ports` 48 | `sfp_ports` 0, `sfp+_ports` 48 |

This matters because these columns feed `comparisonSpecs` and the RFP sheet — a doubled
port count goes straight into a customer-facing document.

### Rows added (transcribed from the Data Center datasheet)

`2048F`, `2048F-B2F`, `3032G` — all fields populated from the spec table.

### Rows archived

`108E`, `108E-POE`, `124E`, `124E-POE` moved to `archive/fortiswitch_discontinued.csv`.
None appear on fortinet.com any more; the 100-series is now F/G (108F, 110G, 124F, 124G,
148F). Nothing was deleted — restoring a row is a copy-paste. Your colleague's note that
148E is discontinued is consistent: no E-series 100 models remain.

---

## Part 2 — Open items needing a decision

**1. `1048E` — probably should be archived too.**
It still appears on the website product page but it is **absent from the April 2026 Data
Center datasheet**, which covers only 1024E, T1024E, T1024F-FPOE, 2048F, 2048F-B2F, 1048G,
3032G. Its numbers (144000 MAC, 0.8 µs latency, ACL 8000, DDR3) can no longer be checked
against any current source. Its `qsfp+_ports` 6 / `qsfp28_ports` 4 is also a genuine
either/or ("a choice of 6 x 40GE QSFP+ **or** 4 x 100GE QSFP28") — currently counted as
both, which is the only remaining double-count in the file. Left as-is pending your call.

**2. `release_year` is now blank on every row.**
It was wrong where present — `1048G` was tagged 2016, but the G-series post-dates that by
years, and FortiAP `441K` was tagged 2021 despite being an 802.11be (Wi-Fi 7) product.
Rather than carry wrong data, both were blanked.

Fortinet does not publish release year in datasheets. If the goal is EOL/EOS visibility
(as your colleague noted), the right source is Fortinet's product lifecycle / End-of-Order
listings, and the right columns are `eoo_date` / `eos_date` / `eol_date` rather than a
guessed release year. Recommend replacing the field rather than filling it.

**3. `heat_diss_btuh` on PoE models is not a bug — do not "correct" it.**
Fortinet lists heat dissipation **excluding the PoE payload**. E.g. 224E-POE: 74.29 BTU/h
= 21.8 W, which is the switch's own draw, not the 223.57 W total. Verified against the
non-PoE sibling (224E max 17.3 W → 59.095 BTU/h, exact). Any validator should skip this
check when `poe_budget > 0`. Worth a line in CLAUDE.md.

**4. `2048F` heat dissipation is inconsistent in Fortinet's own datasheet.**
It prints `175,7 W` (comma decimal) and `406 BTU/h`; 175.7 W is ~599 BTU/h. Transcribed as
printed. Flagging rather than silently picking one.

**5. The 200-series rows are unverified.** `224E`, `224E-POE`, `248D`, `248E-POE`,
`248E-FPOE` came straight from the xlsx. The Secure Access datasheet would not extract
(see below), so nothing was checked. Their internal arithmetic is self-consistent, which
is mild evidence they're fine.

### Fetches that failed

Fortinet serves datasheets under two path styles. `/data-sheets/<CamelCase>.pdf` extracts
fine — both **Data Center** and **FortiSwitch Rugged** were pulled successfully. The
`/data-sheets/pdf/<kebab-case>.pdf` style returns an empty body every time, and no
CamelCase alias could be found for these three:

| Datasheet | URL | Unlocks |
| --- | --- | --- |
| FortiSwitch Secure Access (100/200) | `.../data-sheets/pdf/fortiswitch-secure-access-series.pdf` | 13 new models + verifies the 5 existing 200-series rows |
| FortiSwitch Campus (300/400/600) | `.../data-sheets/pdf/fortiswitch-campus-series.pdf` | 14 new models |
| FortiAP | `.../data-sheets/pdf/fortiap-series.pdf` | 13 new models + verifies 441K |

Save them into `datasheets/` (already gitignored) using the browser's own download — a
text-based PDF, not a scan or a print-to-image.

**Rugged is already in hand** (rev `FSR-DAT-R35-20260730`): FSR-108F, FSR-112F-POE,
FSR-216F-POE, FSR-424F-POE. It needs a schema decision before loading — see below.

### FortiAP data quality

- `no_of_antennas` holds a prose description ("Internal: x4 dual band WIFI + …") while
  `antenna_supported` is blank. The two columns look swapped or conflated — `no_of_antennas`
  should be a count (12 for the 441K).
- `certifications` and `support_years` are blank.
- `ge_ports` blank while `mugig_ports` is 2 — consistent with the new convention, no change needed.

---

## Part 2b — Datasheet pass (2026-08-10, after the three PDFs landed)

All three extract cleanly with `pdftotext -layout`. The AP datasheet is a two-column
layout that interleaves when read straight through — crop each column separately:

```bash
pdftotext -f $PAGE -l $PAGE -layout -x 0   -y 0 -W 306 -H 792 file.pdf -   # left
pdftotext -f $PAGE -l $PAGE -layout -x 306 -y 0 -W 306 -H 792 file.pdf -   # right
```

**Switches: 13 → 42 rows.** Added 13 Secure Access models (`FS-SA-DAT-R67-20260206`) and
16 Campus models (`FS-CAM-DAT-R17-20260713`). The campus datasheet also lists `324G` /
`324G-FPOE`, which the website product page omits — both included.

**The 200-series rows are now confirmed.** Every value the xlsx carried for 224E,
224E-POE, 248D, 248E-POE and 248E-FPOE matches the datasheet exactly, down to
`74.29554 BTU/h`. Nothing needed changing.

**Independent cross-check.** `interface_raw` was re-parsed for every row, port speeds
summed, and compared against the stated switching capacity (Fortinet quotes duplex = 2×
line rate). **40 of 42 match exactly.** The two that don't are both explained: `M426E-FPOE`
is a parser artifact ("8x 2.5 GE" with a space — manual check gives 16×1 + 8×2.5 + 2×5 +
4×10 = 86 → 172 Gbps ✓), and `1048E` is the known either/or. Script kept at
`crosscheck.py`; worth wiring into the build.

**APs: 1 → 12 rows** (`FAP-DAT-R80-20260423`). 441K's existing figures were confirmed
(1.148 / 8.648 / 11.530 Gbps). Two currently-sold models — `23JF` and `432FR` — are *not*
in this datasheet; they need the outdoor/rugged AP datasheet.

AP gaps, all left blank rather than guessed: `certifications` (0/12 — not stated
per-model), `release_year`, `support_years`, plus `weight_kg` on 6 models and
dimensions/temps on 3–4 (the datasheet omits them for several outdoor units). `831F`
quotes one aggregate PHY rate (5.95 Gbps 802.11ax) rather than per-band, so its
`max_phy_band_*` fields are blank.

New convention: **`noise_lvl_dba` = 0 means fanless**, matching how the original rows
encoded it. Applied to all fanless models including 224E, which was previously blank.

## Part 3 — Coverage gap

**Switches: 13 of 40 currently-sold models.** Missing:

- 100 series: `108F`, `108F-PoE`, `108F-FPoE`, `110G-FPOE`, `124F`, `124F-POE`, `124F-FPOE`, `124G`, `124G-FPoE`, `148F`, `148F-PoE`, `148F-FPOE`
- 200 series: `224D-FPOE`
- 300/400 campus: `348G`, `348-FPoE`, `424E`, `424E-Fiber`, `424E-POE`, `424E-FPoE`, `M426E-FPoE`, `448E`, `448E-PoE`, `448E-FPoE`
- 600 series: `624F`, `624F-FPOE`, `648F`, `648F-FPOE`
- Rugged: `FSR-108F`, `FSR-112F-PoE`, `FSR-216F-POE`, `FSR-424F-POE`

**APs: 1 of 14 currently-sold models.** Missing: `221K`, `222KL`, `231K`, `23JK`, `241K`,
`243K`, `244K`, `443K`, `234G`, `432G`, `23JF`, `432FR`, `831F`.

Rugged switches are arguably a fourth product type (different environmental spec set) —
worth deciding whether they get their own CSV or a `rugged` flag on the switch table.

---

## Part 4 — Schema strategy per device type

**The current design is already the right one — keep it.** Three CSVs → three tables →
three `productConfig` blocks. Do not merge into one wide table: 45 columns × 3 types would
give ~100 mostly-NULL columns, and the per-column numeric typing that currently fails the
build on a bad cell would lose most of its value.

Adding a type is a 4-file change and nothing else moves:

```
fortiX_specs.csv                          data
scripts/build-db.js  + import_data.py     X_TYPES map + PRODUCTS entry
vite.config.ts       + api/devices.js     TABLE_BY_TYPE entry
src/productConfig.js                      PRODUCT_TYPES block + PRODUCT_ORDER
```

Three refinements worth making now, while the data is still small:

**a. Define a required common core.** Every type must carry: `vendor`, `family`, `model`,
`series`, `interface_raw`, `mtbf_years`, `datasheet_url`, `datasheet_date`, plus whatever
lifecycle field replaces `release_year`. Everything generic (search, cards, lifecycle
badges, "data incomplete" warnings) can then be written once instead of per type.

**b. Fix the header typos now.** `spf28_ports` → `sfp28_ports`, `dimentions_*` →
`dimensions_*`, `air_flw` → `air_flow`, `strg_temp` → `storage_temp`. Each is a
find-and-replace across exactly 4 files. The cost only goes up as models are added, and
`spf28_ports` in particular is the kind of thing someone will silently mistype later.

**c. Document the port convention in CLAUDE.md** — one physical port, one column, max
speed; combos live in `interface_raw`. This pass had to undo it once already.

---

## Part 5 — UI plan

The product selector and the generic detail renderer already work; the gaps are in *what*
each type shows.

**Grid cards.** Switch cards currently lead with Switching Capacity / PPS — near-useless
for choosing a switch. A buyer picks on port count and PoE. Suggest `Ports` (a computed
total) + `PoE Budget`, falling back to capacity for the data-center models where PoE is 0.
AP cards should lead with `Standard` + aggregate max PHY rather than 5 GHz alone, now that
6 GHz models exist.

**Detail page.** Physical and environmental specs are collected in the CSV but rendered
nowhere. Add a `Physical & Environment` group (dimensions, weight, airflow, noise,
operating/storage temp, humidity) for switches and APs. For APs also surface mount options
and the security/EAP text blocks, which are currently dead columns.

**Comparison sheet.** Switch comparison should add `PoE Ports` and total copper ports —
those are what an RFP actually compares. Keep row order stable across types so the sheet
reads consistently.

**RFP.** `switch.rfpSpecs` and `ap.rfpSpecs` are still the curated placeholders noted in
CLAUDE.md; they need the owner's exact ordered list before the switch/AP RFP export can be
trusted. Separately, the numeric "Create RFP" filter is firewall-only by design — for
switches the meaningful numeric filters (capacity, PPS, PoE budget, port counts) do exist,
so this is worth enabling per type with a per-type requirement field list. APs stay
text-heavy and should probably remain filter-free.

**Sparse-data handling.** With 27 switch models still to fill, blanks will be common. The
existing `has()` guard hides them cleanly, but silently — a "specs incomplete" badge on
cards missing common-core fields would make the gaps visible instead of making a
half-filled model look like a complete one in a customer comparison.

**Filtering.** Once the model count passes ~40, add series/family filter chips (100 / 200 /
400 / 600 / 1000+ / Rugged) alongside the search box.
