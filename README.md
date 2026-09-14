# MadNO2

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

*Read this in [Español](README_ES.md).*

MadNO2 is a serverless web platform for exploring, analysing and visualising
nitrogen dioxide (NO₂) pollution in Madrid. It covers 24 years of hourly data
(2001–2024) on a hexagonal grid, and runs entirely in the browser: there is no
backend, no API and no database server.

The viewer queries partitioned Parquet files directly over HTTP range requests
using DuckDB-WASM, and renders the results with deck.gl and D3.

## Data

The primary observations are the hourly air-quality measurements published by
the Madrid City Council on its open data portal
([datos.madrid.es](https://datos.madrid.es)), together with the inventory of
the municipal monitoring network. Only NO₂ (magnitude code 8) is used.

Those point measurements are interpolated with ordinary kriging onto H3
resolution-9 cells (~400 m across), producing one surface per hour: about
210,000 time steps and 325 million rows in total.

The derived dataset is published separately on Zenodo under CC BY 4.0. The
viewer expects it under `public/data/parquet`, partitioned as
`year=YYYY/month=MM/data.parquet`.

## Features

- **3D hexagon map.** H3 cells rendered with deck.gl, with adjustable radius,
  elevation and opacity.
- **Time animation.** Play back a sequence by year, month, day and hour.
- **Analysis panel** with five families of queries over the Parquet files:
  temporal patterns, spatial hotspots and thresholds, extreme events,
  year-to-year comparisons, and descriptive statistics with EU compliance
  checks.
- **SQL access.** Every analysis exposes the DuckDB query behind it, which you
  can edit, re-run and export to CSV.
- **Bilingual interface.** English and Spanish, selected automatically from the
  browser language and switchable from the flag menu at the top right.

## Requirements

- Node.js 18 or newer
- npm

## Getting started

```bash
git clone https://github.com/elgeografo/madno2.git
cd madno2/madno2-viewer
npm install
npm run dev
```

The app is served at `http://localhost:5173`.

## Building for production

```bash
npm run build
```

The output in `dist/` is fully static. Any HTTP server will do, with two
requirements: it must support **HTTP range requests** (DuckDB-WASM reads
Parquet files in slices) and it should serve the data files from the same
origin as the app, or send the appropriate CORS headers.

The `base` path is set in `vite.config.js`; change it if you deploy under a
different sub-path.

## Repository layout

```
madno2/
├── madno2-viewer/          Web application (React + Vite)
│   ├── src/components/     UI components, incl. the analysis panel
│   ├── src/i18n/           Translation catalogue and language context
│   ├── src/utils/          DuckDB access layer and D3 renderers
│   └── src/config/         Map, style and data-source configuration
├── scripts/                Data pipeline (download, interpolate, export)
└── dockers/                Optional PostGIS setup
```

The processing pipeline lives in `scripts/`, numbered in execution order: it
parses the yearly archives, interpolates each hour onto the H3 grid and writes
the partitioned Parquet dataset.

## Internationalisation

All user-facing text lives in `src/i18n/translations.js`, with the longer help
texts in `src/i18n/helpContent.js`. English is the default and the fallback for
any missing key. To add a language, add its entry to both files and list its
code in `SUPPORTED_LANGUAGES`.

## Citation

If you use this software or the dataset, please cite the Zenodo record and
credit the Ayuntamiento de Madrid as the source of the original measurements.

## Licence

Source code released under the [MIT License](LICENSE). The derived NO₂ dataset
is distributed on Zenodo under CC BY 4.0. The original measurements are
© Ayuntamiento de Madrid.
