# Fortinet Specs Lookup

A web app for looking up Fortinet product specifications and exporting them as
Excel spreadsheets — a company-formatted **RFP** sheet and side-by-side
**comparison** sheets.

Covers three product families:

| Type | Table | Models |
| --- | --- | --- |
| FortiGate (firewall) | `devices` | 26 |
| FortiSwitch | `switches` | 42 |
| FortiAP | `aps` | 12 |

Built with React + Vite. Specs live in one CSV per product type, compiled into a
read-only SQLite database at build time and served through a small JSON API.

## Getting started

```bash
npm install
npm run build      # compiles the 3 CSVs -> public/build.db, then builds the app
npm run dev        # dev server at http://localhost:5173 (serves /api/devices itself)
```

`npm run dev` works on its own — a small Vite plugin serves `/api/devices` straight
from `public/build.db`, so no separate API server is needed. If you see
"build.db not found", run `npm run build` once to generate it.

## Features

- **Product tabs** — switch between firewalls, switches and access points.
- **Sorted by capability, not by name.** Models are ordered by the metric that
  matters for each type (firewall throughput, switching capacity, PHY rate), so a
  card's position on the page carries meaning. A plain name sort would put
  FG-1000F ahead of FG-100F.
- **Tier bands** — the catalogue is grouped into Entry / Mid-range / Enterprise /
  Data Center (firewalls), Secure Access / Campus / Core (switches), or
  Indoor / Wall & desktop / Outdoor (APs).
- **Two views** — cards for browsing, a dense sortable table for comparing.
- **Search** by model, series, or interface text, so `sfp28`, `poe` and `48x GE`
  all find the right models.
- **Comparison tray** — pick up to 5 models from any card or row; the selection
  docks at the bottom and survives searching, sorting and view changes, then
  exports as a side-by-side sheet.
- **RFP requirements filter** — enter customer requirements and the list narrows
  to models that meet every one, ranked so the **least over-provisioned model
  comes first**. The top match is surfaced as a "Recommended" banner with its
  tightest margin, since the useful answer for a quote is the smallest adequate box.
- **Generate RFP** — exports the selected model in the company template: a
  byte-exact `Ерөнхий шаардлага` (general requirements) placeholder block as item 1,
  plus the model's specs as item 2, with a `Qty` column for manual entry.
- **Export to Excel** — a single-model sheet with an optional customer-requirement
  column and a More/Same/Less comparison.

## Project layout

```
fortigate_specs.csv          Source of truth for firewall specs (edit these).
fortiswitch_specs.csv
fortiap_specs.csv
archive/                     Discontinued models, same columns — restoring a row is a copy-paste.
docs/SWITCH_AP_ROLLOUT.md    Data audit and provenance: what was verified, against which
                             datasheet revision, and what is still unverified.
schema.sql                   Reference schema (documentation).
scripts/
  build-db.js                Compiles the 3 CSVs into public/build.db (run by `npm run build`).
  crosscheck.py              Re-derives switching capacity from interface_raw and flags mismatches.
  validate-switches.py       Type, unit and PoE sanity checks over the switch CSV.
  check-icons.mjs            Verifies every lucide-react icon used in src/ actually exists.
import_data.py               Standalone Python equivalent of build-db.js (manual rebuilds).
public/build.db              Generated SQLite DB (git-ignored).
api/devices.js               Vercel serverless function serving /api/devices in production.
vite.config.ts               Vite config + a dev-only /api/devices handler for `npm run dev`.
src/
  productConfig.js           Per-type configuration — see below.
  App.jsx                    Main UI.
  components/                Search bar, device grid/card, table, compare tray, RFP modal.
  utils/
    excelExport.js           RFP + comparison spreadsheet generation (ExcelJS).
    rfpBoilerplate.js        Extracted general-requirements baseline text.
    formatters.js            Number formatting helper.
datasheets/                  Source datasheet PDFs (git-ignored; used to populate the CSVs).
```

## src/productConfig.js

Everything type-specific lives in this one file: which table to query, what the
cards and detail panel show, how the list is sorted and banded, which fields accept
an RFP requirement, and what the exports contain. The components and the export code
are generic and read from it.

**To change what a product shows or exports, edit `productConfig.js`, not the
components.**

## Updating device data

1. Edit the relevant CSV (one row per model). Values use the units the column names
   imply — throughput in Gbps, latency in µs, PPS in Mpps, counts as plain integers.
   Keep units *out* of numeric cells: `2160`, not `2160 Gbps`.
2. Regenerate the database:
   - `npm run build` (uses `scripts/build-db.js`), or
   - `python import_data.py`, which writes `build.db` to the repo root — move it into `public/`.
3. Run the validators:
   ```bash
   python scripts/crosscheck.py fortiswitch_specs.csv
   python scripts/validate-switches.py fortiswitch_specs.csv
   ```

Both builders enforce column types (REAL / INTEGER / TEXT) and fail loudly if a
numeric column contains a non-numeric value.

### Data conventions

These are easy to get wrong and are customer-visible once they reach an RFP:

- **Blank means unknown. `0` means known-none.** Never write `0` for "not
  documented" — a blank sorts to the end of the list and renders as `—`, whereas a
  `0` ranks the model as the smallest one.
- **One physical port, one column, at its maximum speed.** A "24x 10G/1G SFP+/SFP"
  cage is 24 in `sfp+_ports` and 0 in `sfp_ports`, not 24 in both. Multi-speed
  capability belongs in `interface_raw` only.
- **`noise_lvl_dba` of 0 means fanless**, not unknown.
- **`heat_diss_btuh` on PoE models excludes the PoE payload** — that is Fortinet's
  own convention, so heat does not equal max power × 3.412 on those models. Don't
  "correct" it.
- **`release_year` is intentionally blank.** Fortinet doesn't publish it, and the
  values previously in the data were wrong. For lifecycle visibility, add
  `eoo_date` / `eos_date` / `eol_date` from Fortinet's lifecycle pages instead.

The datasheet PDFs in `datasheets/` are the source material; each row also stores its
`datasheet_url` and `datasheet_date`. See `docs/SWITCH_AP_ROLLOUT.md` for which rows
were verified against which datasheet revision.

## Database schema

Each table's columns are its CSV header, plus an auto `id` and a computed
`model_norm` (lowercased, alphanumeric-only) used for search. Columns are typed:
throughputs and latency are `REAL`, counts and ports are `INTEGER`, and
identity/interface/datasheet fields are `TEXT`.

`schema.sql` currently documents only the firewall `devices` table; the build
scripts define the real schema for all three.

## Deployment

Deployed on Vercel. The build command compiles the CSVs into `public/build.db`, and
`api/devices.js` serves the data as a serverless function (see `vercel.json`).
