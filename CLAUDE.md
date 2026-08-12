# CLAUDE.md

Project context for the **Fortinet Specs Lookup** app. Read this first when picking
up the project in a new session.

## What this is

A React + Vite web app for browsing Fortinet product specs and exporting them as
Excel spreadsheets — a company-formatted **RFP** sheet and side-by-side
**comparison** sheets. It covers three product types: **FortiGate (firewall)**,
**FortiSwitch**, and **FortiAP**. Specs live in per-type CSVs that compile into a
read-only SQLite database at build time; the frontend reads that DB through a small
JSON API.

**The two jobs that matter are comparison and RFP generation.** Browsing is a means
to those ends — when a UI decision is ambiguous, favour whichever option gets a user
to a correct comparison sheet or RFP faster.

Deployed on Vercel. Local dev needs no separate server (a Vite plugin serves the API).

## Quick start

```bash
npm install
npm run build      # compiles the 3 CSVs -> public/build.db, then builds the app
npm run dev        # http://localhost:5173, serves /api/devices itself
```

If you edit a CSV, re-run `npm run build` (or `python import_data.py`, which writes
`build.db` to the repo root — move it to `public/`). `npm run dev` serves whatever is
in `public/build.db`; "build.db not found" means you haven't built yet.

## Architecture / data flow

```
fortigate_specs.csv  ─┐
fortiswitch_specs.csv ─┤─ build-db.js / import_data.py ─→ public/build.db
fortiap_specs.csv    ─┘        (3 tables: devices, switches, aps)
                                        │
        /api/devices?type=firewall|switch|ap   (vite.config.ts dev plugin;
                                        │        api/devices.js on Vercel)
                                        ▼
                        src/App.jsx  ──reads──  src/productConfig.js
                                        │
        DeviceGrid (tier bands) / DeviceTable / CompareTray / RfpModal / detail panel
                                        │
                        src/utils/excelExport.js  (RFP + comparison .xlsx)
```

The single most important file is **`src/productConfig.js`** — it is the source of
truth for everything type-specific: which table, what the cards show, how the list is
sorted and banded, which fields accept RFP requirements, and what the exports contain.
The UI and the exports are generic and read from it. **To change what a product shows
or exports, edit that file, not the components.**

## File map

```
fortigate_specs.csv / fortiswitch_specs.csv / fortiap_specs.csv
                         Source of truth for specs (one row per model). Edit these.
archive/                 Discontinued models pulled out of the live CSVs, same columns.
docs/SWITCH_AP_ROLLOUT.md  Data audit + provenance for the switch/AP rollout. Read before
                         touching spec data — it records what was verified and what wasn't.
scripts/build-db.js      Compiles the 3 CSVs into public/build.db (run by `npm run build`).
scripts/check-icons.mjs  Verifies every lucide-react icon used in src/ exists (see gotchas).
scripts/crosscheck.py    Re-derives switching capacity from interface_raw; flags disagreements.
scripts/validate-switches.py  Type/unit/PoE sanity checks over fortiswitch_specs.csv.
import_data.py           Standalone Python equivalent of build-db.js (manual rebuilds).
schema.sql               Reference schema — CURRENTLY ONLY documents the firewall table (see TODO).
public/build.db          Generated SQLite DB (git-ignored).
api/devices.js           Vercel serverless function; serves /api/devices?type=.
vite.config.ts           Vite config + dev-only /api/devices handler.
src/productConfig.js     ★ Per-type config + sorting/banding helpers.
src/App.jsx              Main UI; product tabs, sort, RFP filter, best-fit, detail panel.
src/components/          searchBar, deviceGrid, deviceCard, deviceTable, compareTray, rfpModal.
src/utils/
  excelExport.js         Config-driven RFP + comparison spreadsheet generation (ExcelJS).
  rfpBoilerplate.js      Byte-exact "Ерөнхий шаардлага" general-requirements text.
  formatters.js          formatNumber helper.
datasheets/              Source datasheet PDFs (git-ignored). Extract with pdftotext -layout.
```

## Data model

Three tables, one per product type, all built the same way:

- `devices` (firewall, **26 rows**), `switches` (**42**), `aps` (**12**).
- Each table's columns = its CSV header. An auto `id` and a computed `model_norm`
  (lowercased, alphanumeric-only, for search) are added.
- **Column typing**: `build-db.js` / `import_data.py` hold a `*_TYPES` map per product
  (`real` / `int` / `text`). Throughputs/latency/rates → REAL; counts/ports/years → INTEGER;
  everything else → TEXT. The builders CAST on insert and **fail loudly** if a numeric
  column contains non-numeric text — so keep units OUT of numeric CSV cells (e.g.
  `switching_capacity_gbps` = `2160`, not `2160 Gbps`).
- **Blank = unknown. 0 = known-none.** Never write 0 to mean "not documented" — a blank
  sorts to the end of the list and renders as `—`, whereas a 0 ranks the model as the
  smallest one. This is a real bug that shipped once (see gotchas).

### Spec-data conventions (do not re-derive these)

- **Port counts: one physical port, one column, at its maximum speed.** A "24x 10G/1G
  SFP+/SFP" cage is 24 in `sfp+_ports` and 0 in `sfp_ports`, not 24 in both. Multi-speed
  capability belongs in `interface_raw` only. Double-counting flows straight into the
  comparison sheet and the RFP, so it is customer-visible.
- **`noise_lvl_dba` = 0 means fanless**, not "unknown" and not "silent".
- **`heat_diss_btuh` on PoE models excludes the PoE payload.** Fortinet's own convention:
  FS-224E-POE lists 74.29 BTU/h against 223.57 W. So heat ≠ max power × 3.412 for any
  model with a PoE budget. Do not "fix" this — validators should skip the check when
  `poe_budget > 0`.
- **`release_year` is blank everywhere on purpose.** The values that were there were
  wrong (a G-series switch tagged 2016; a Wi-Fi 7 AP tagged 2021) and Fortinet doesn't
  publish release year in datasheets. If the goal is EOL/EOS visibility, add
  `eoo_date` / `eos_date` / `eol_date` from Fortinet's lifecycle pages instead.
- **`archive/fortiswitch_discontinued.csv`** holds models no longer sold (108E, 124E and
  their PoE variants). Same columns; restoring a row is a copy-paste.

## productConfig.js — the extension point

Each product type defines:

- `label`, `apiType`, `rfpLabel` (column-B text in the RFP), `fileTag` (export filename prefix).
- `cardSpecs`: the 2 specs shown on each grid card.
- `detailGroups`: grouped spec cards on the detail page (`icon` is a lucide-react name
  resolved in App.jsx: Zap/Shield/Wifi/HardDrive/Users/Network/FileText).
- `comparisonSpecs`: rows in the comparison sheet; the first 6 are also the table columns.
- `requirementSpecs`: numeric fields the RFP modal accepts a customer requirement for.
- `rfpSpecs`: ordered lines in the RFP "Technical specification" cell.
- `sortOptions`: `[{ label, key }]`, or `{ sum: [keys] }` for a derived total, or
  `{ key: 'model', text: true }`. **The first entry is the default sort.**
- `tierBy` + `tiers`: how the list is banded. `tierBy: 'modelNumber'` buckets on the
  digits in the model against each tier's `max`; `tierBy: 'field'` + `tierField` matches
  a column value against each tier's `values` (APs band by `type`, because `23JK` would
  otherwise sort below `221K`).

Spec row shape: `{ label, key, unit?, count?, keys?, sep? }`
- `key` → `device[key]`; `keys`+`sep` → combine fields (e.g. `5 / 5 / 4`);
- `unit` → appended; `count: true` → thousands separators.

Exported helpers: `modelNumber`, `sortValue`, `hasSortValue`, `sortDevices`, `groupIntoTiers`.

## UI behaviour worth knowing

- **The list is sorted by capability, never by name.** The API's `ORDER BY model` is a
  string sort and put FG-1000F before FG-100F, and 1024E before 108F. `sortDevices()`
  re-sorts client-side so a card's position carries meaning. Devices missing the sort
  metric go **last**, never first.
- **Tier bands** (Entry/Mid/Enterprise/DC; Secure Access/Campus/Core; Indoor/Wall/Outdoor)
  come from `groupIntoTiers`. Banding is skipped while the RFP filter is active, because
  the filter's ranking would fight it.
- **The grid wraps** (CSS grid, `auto-fill minmax(240px, 1fr)`). It used to scroll
  horizontally, which hid most of the catalogue.
- **Comparison selection is ambient**, not modal: a `+` on every card/row feeds a
  persistent `CompareTray` docked at the bottom, max 5, surviving search/sort/view
  changes. The old `MultiModelModal` was deleted — don't reintroduce a second grid.
- **Table view** (`DeviceTable`) is the dense alternative to cards; its columns are
  `comparisonSpecs.slice(0, 6)` and its headers sort when a `sortOption` targets the
  same key.
- **RFP filter works for all three types**, driven by `requirementSpecs`.
  `filterByRfpRequirements` keeps only models meeting every stated requirement and ranks
  them **ascending by summed ratio — the least over-provisioned model first**, because
  the useful answer for a quote is the smallest adequate box. The top result is surfaced
  as the "Recommended" banner with its tightest margin. If you ever want "most headroom
  first", flip `sa - sb` back to `sb - sa` in `App.jsx`.
- **Search matches** model, `model_norm`, series and `interface_raw` — the last one so
  "sfp28", "poe" or "48x GE" find the right models.

## Exports (src/utils/excelExport.js)

- `exportRfpMatch(device, formatNumber, rfpRequirements, { product })` — the company
  RFP template: item 1 = the byte-exact "Ерөнхий шаардлага" placeholder block (from
  `rfpBoilerplate.js`), item 2 = the device's `rfpSpecs`. Column B labeled from
  `product.rfpLabel`. Qty column left blank for manual entry.
- `exportSingleWithRFP(...)` — single device sheet with an optional customer-requirement
  column + More/Same/Less comparison formula.
- `exportMultipleModels(devices, formatNumber, product)` — side-by-side, up to 5 models.

The firewall RFP is **byte-identical** to the company's `C9500 RFP` baseline (Sheet1) —
header fill `#B4C6E7`, D1–D5 borderless, general-requirement rows sized/aligned to match.
If you touch `exportRfpMatch` or `rfpBoilerplate.js`, re-verify against that baseline.

## Adding a new product type (future)

1. Add the CSV (`fortiX_specs.csv`) and a `X_TYPES` map + `PRODUCTS` entry in BOTH
   `scripts/build-db.js` and `import_data.py`.
2. Add a `TABLE_BY_TYPE` entry in `vite.config.ts` and `api/devices.js`.
3. Add a block to `src/productConfig.js` (cardSpecs, detailGroups, comparisonSpecs,
   requirementSpecs, rfpSpecs, sortOptions, tiers) and to `PRODUCT_ORDER`.
4. `npm run build`, then verify grid/table/compare/RFP for the new type.

## TODO / pending

- **Switch & AP RFP spec lists**: `switch.rfpSpecs` / `ap.rfpSpecs` in productConfig.js
  are curated PLACEHOLDERS. The owner is providing exact ordered field lists + labels —
  drop them in (one-block edit, nothing else changes).
- **Missing models.** Switch coverage is 42 of ~46 currently sold: the 4 **FortiSwitch
  Rugged** units (FSR-108F, FSR-112F-PoE, FSR-216F-POE, FSR-424F-POE) are transcribed but
  not loaded, because they don't fit the switch schema — MTBF 30 years, redundant DC input
  rather than dual AC PSU, IP rating, DIN-rail form factor, and heat/power quoted twice
  (with and without PoE). Decide: own CSV/product type, or extra nullable columns.
  APs are 12 of 14 — `23JF` and `432FR` live in a separate outdoor/rugged AP datasheet.
- **`1048E` is probably EOL.** Still on fortinet.com but absent from the April 2026 Data
  Center datasheet, and it holds the last remaining port double-count (`qsfp+_ports` 6 AND
  `qsfp28_ports` 4, which the datasheet describes as "a choice of"). Archive or correct.
- **AP data gaps**, deliberately left blank: `certifications` (0/12 — not stated per model),
  `weight_kg` (6/12), dimensions/temps on 3–4 outdoor units. `831F` quotes one aggregate
  PHY rate rather than per-band, so its `max_phy_band_*` are empty.
- **Blank cells in exports** currently render as empty rather than `—`; in a customer-facing
  RFP an empty cell reads as a spec of zero. Cards already show a "specs incomplete" marker.
- **Comparison sheet** doesn't highlight the best value per row — cheap to add, makes the
  Excel decision-ready.
- **schema.sql** documents only the firewall `devices` table — add `switches`/`aps`.
- **Datasheet automation** (discussed, not built): a `scripts/extract_datasheets.py`
  that reads `datasheets/*.pdf`, maps filename→model, updates the CSV, and reports diffs.

## Conventions & gotchas (learned the hard way)

- **CSV encoding**: the switch/AP CSVs came as UTF-8-with-BOM (and one had stray CP1252
  bytes). Builders strip the BOM; keep CSVs UTF-8. Excel-on-Windows sometimes saves
  CP1252 — if a build shows mojibake, re-save as UTF-8. Keep en-dashes out of the data;
  they were normalised to ASCII hyphens (only `°` remains non-ASCII).
- **Special-char column names** (`sfp+_ports`, `antenna_gain_2.4_dbi`): all SQL
  identifiers are double-quoted in the builders. Access them in JS via bracket notation
  (`device["sfp+_ports"]`), which productConfig keys already do. Note `spf28_ports` is a
  **typo for sfp28** that is baked into the CSV header, both builders and productConfig —
  rename all four together or not at all. Same for `dimentions_*`, `air_flw`, `strg_temp`.
- **Numeric typing is strict**: a non-numeric value in an `int`/`real` column FAILS the
  build with a clear `table.col` message. That's intentional (catches data-entry errors).
- **exceljs is pinned to ^4.4.0 with an npm `override` forcing `uuid ^11.1.1`** (clears
  audit advisories). Don't run `npm audit fix --force` — it would downgrade exceljs and
  reintroduce worse issues.
- **better-sqlite3 is a native module** — it won't load in some sandboxed/Linux CI
  contexts. `import_data.py` (pure Python sqlite3) is the fallback for rebuilding the DB
  where better-sqlite3 can't run.
- **Cowork mount writes can truncate** large files mid-write and reads can be stale.
  After a big write, verify with `node --check` / `wc -l` / `esbuild`, and prefer a full
  atomic rewrite over blind appends.
- **lucide-react is pinned at 0.263.1 — icon names differ from current docs.** `Rows3`,
  `Rows2` etc. do not exist here; the icon is still `Rows`. A missing named export
  imports as `undefined` and rendering it throws, which shows as a **blank white page**
  with no obvious error. Run `node scripts/check-icons.mjs`.
- **Validate frontend changes without a browser — do NOT mark `lucide-react` external**,
  that is exactly what hides missing icon exports:
  ```bash
  npx esbuild src/main.jsx --bundle --format=esm --jsx=automatic \
    --external:react --external:react-dom --external:react/jsx-runtime \
    --external:exceljs --outfile=/dev/null
  node scripts/check-icons.mjs
  ```
- **Fortinet datasheet URLs come in two shapes.** `/data-sheets/<CamelCase_Name>.pdf`
  fetches fine; `/data-sheets/pdf/<kebab-case-name>.pdf` returns an empty body from
  automated fetchers. If a datasheet won't extract, try the CamelCase alias first.
- **The FortiAP datasheet is a two-column layout** and interleaves if read straight
  through. Crop each column:
  ```bash
  pdftotext -f $PAGE -l $PAGE -layout -x 0   -y 0 -W 306 -H 792 file.pdf -   # left
  pdftotext -f $PAGE -l $PAGE -layout -x 306 -y 0 -W 306 -H 792 file.pdf -   # right
  ```
- `scripts/crosscheck.py` re-derives switching capacity from `interface_raw` port speeds
  (Fortinet quotes duplex = 2× line rate) and flags rows that disagree — **run it after
  any spec CSV edit**. It catches transcription errors that type-checking can't.

## Deployment

Vercel. Build compiles the CSVs into `public/build.db`; `api/devices.js` serves it as a
serverless function (see `vercel.json`). `npm run dev` uses the Vite plugin instead.
