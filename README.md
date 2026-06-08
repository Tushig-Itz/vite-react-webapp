# FortiGate Specs Lookup

A web app for looking up FortiGate firewall specifications and exporting them as
Excel spreadsheets — including a company-formatted **RFP** sheet and side-by-side
**comparison** sheets.

Built with React + Vite. Specs live in a single CSV that is compiled into a
read-only SQLite database at build time.

## Features

- **Search** the FortiGate catalog by model or series.
- **Spec detail view** for any model (throughput, sessions, VPN, SSL inspection,
  interfaces, lifecycle, and a link to the source datasheet).
- **Generate RFP** — exports the selected model in the company template: a
  byte-exact `Ерөнхий шаардлага` (general requirements) placeholder block as item 1,
  plus the model's firewall specs as item 2, with a `Qty` column for manual entry.
- **Export to Excel** — a single-model sheet with an optional customer-requirement
  column and a More/Same/Less comparison.
- **Compare Models** — side-by-side comparison of up to 5 models.

## Project layout

```
fortigate_specs.csv      Source of truth for all device specs (edit this).
schema.sql               Reference schema (documentation).
scripts/build-db.js      Compiles the CSV into public/build.db (run by `npm run build`).
import_data.py           Standalone Python equivalent of build-db.js (manual rebuilds).
public/build.db          Generated SQLite DB (git-ignored).
api/devices.js           Vercel serverless function serving /api/devices in production.
vite.config.ts           Vite config + a dev-only /api/devices handler for `npm run dev`.
src/
  App.jsx                Main UI.
  components/            Search bar, device grid/card, RFP + multi-compare modals.
  utils/
    excelExport.js       RFP + comparison spreadsheet generation (ExcelJS).
    rfpBoilerplate.js    Extracted general-requirements baseline text.
    formatters.js        Number formatting helper.
datasheets/              Source datasheet PDFs (git-ignored; used to populate the CSV).
```

## Getting started

```bash
npm install
npm run build      # compiles fortigate_specs.csv -> public/build.db, then builds the app
npm run dev        # dev server at http://localhost:5173 (serves /api/devices itself)
```

`npm run dev` works on its own — a small Vite plugin serves `/api/devices` straight
from `public/build.db`, so no separate API server is needed. If you see
"build.db not found", run `npm run build` once to generate it.

## Updating device data

1. Edit `fortigate_specs.csv` (one row per model). Spec values use the units the
   columns imply — throughput in Gbps, latency in µs, PPS in Mpps, counts as plain
   integers. Leave a cell blank if a datasheet doesn't publish that value.
2. Regenerate the database:
   - `npm run build` (uses `scripts/build-db.js`), or
   - `python import_data.py` then move the resulting `build.db` into `public/`.
3. Both builders enforce column types (REAL / INTEGER / TEXT) and will fail loudly
   if a numeric column contains a non-numeric value.

The datasheet PDFs in `datasheets/` are the source material for these values; each
device row also stores its `datasheet_url` and `datasheet_date`.

## Database schema

Columns are typed: throughputs and latency are `REAL`, session/tunnel/port/VDOM
counts are `INTEGER`, and identity/interface/datasheet fields are `TEXT`. See
`schema.sql` for the full column list (kept in sync with the build scripts).

## Deployment

Deployed on Vercel. The build command compiles the CSV into `public/build.db`, and
`api/devices.js` serves the data as a serverless function (see `vercel.json`).
