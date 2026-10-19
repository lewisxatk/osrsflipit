# OSRS Hub — OSRS data archive and storage setup

This update adds a versioned OSRSBox source archive workflow. It is intentionally separate from the GE price feed and does not write to D1.

## What lives where

- **Cloudflare R2 (`osrshub-osrs-archive`)**: versioned full-repository OSRSBox ZIP snapshots plus JSON manifests. This is the recoverable raw-source archive, not the live query database.
- **Cloudflare D1 (`osrshub-accounts`)**: searchable item/equipment/monster/prayer catalogue and source metadata. The existing Worker ingestion populates it in small batches under its daily write governor.
- **GE prices**: remain separate. Current prices continue to come from the existing RuneLite-fed prices service (`prices.runescape.wiki`); D1 keeps only the bounded cache/history/intelligence records the existing worker needs.
- **OSRS Brain**: searches the indexed D1/Wiki records. The archive does not magically become searchable until the relevant datasets are ingested/indexed.

## Safety limits

- Existing D1 estimated write governor remains **25,000 rows/day**. Historical project target is to keep observed usage closer to 14,000/day and preserve headroom; Cloudflare metrics are authoritative.
- The archive script performs **zero D1 writes**. It downloads a version-pinned GitHub ZIP, calculates SHA-256, writes a local manifest, and optionally uploads two objects to R2.
- Existing Worker ingestion remains the only process importing records into D1; it must continue to respect `d1Reserve` and the emergency-stop flag.
- Do not increase ingestion batch sizes or disable the governor to speed up the first import.
- No database migration is required for this archive workflow. Do not run `npm run db:migrate` for this update.

## One-time setup (Windows)

1. In the Cloudflare dashboard, open **R2 Object Storage** and create a private bucket named `osrshub-osrs-archive` (or choose another name and use `--bucket=YOUR_BUCKET`). Do not make the bucket public.
2. Install Node.js 20 or newer if it is not already installed.
3. Extract the OSRS Hub ZIP and open a terminal in the inner `OSRSHub` project folder.
4. Run `npm install` if you need to install the project's normal build dependencies. The archive script itself uses Node built-ins and adds no dependency.
5. Sign in to Cloudflare for Wrangler if you have not already: `npx wrangler login`.
6. Create a local archive first, without uploading:
   `node scripts/archive-osrsbox.mjs`
7. Check the printed commit, size and SHA-256. The `data-archive` folder contains the downloaded ZIP and its manifest. This folder is generated locally and should not be committed to GitHub.
8. Upload the snapshot and manifest to your private R2 bucket:
   `node scripts/archive-osrsbox.mjs --upload`
   For a differently named bucket:
   `node scripts/archive-osrsbox.mjs --upload --bucket=YOUR_BUCKET`

The script fetches the latest OSRSBox repository commit and archives that exact commit. Run it again when you want a newer source snapshot; each commit is saved as a separate object so older snapshots are not overwritten.

## Normal website installation

Upload the changed project files to your existing GitHub repository and let your normal Cloudflare build run. No new Worker binding or secret is required just to use the local archive script. The R2 upload uses Wrangler's authenticated CLI directly.

The archive upload and the D1 ingestion are separate. After deployment, the existing scheduled importer continues ingesting bounded batches. Check the private Data Control Centre/source status and Cloudflare D1 metrics to confirm progress. Do not expect every record to appear in D1 immediately after uploading the archive.

## Licence and attribution

The script preserves the repository's original ZIP contents, including any licence/attribution files, and records the upstream repository and commit in the manifest. Review the repository and dataset-specific terms before redistribution or commercial use. A private copy is not permission to publish all source content without checking its licence.

## Troubleshooting

- **GitHub rate/network error:** retry later; no D1 data is affected.
- **R2 bucket not found:** create the bucket in Cloudflare R2 or pass the correct `--bucket=` value.
- **Wrangler authentication error:** run `npx wrangler login` and retry.
- **D1 writes near budget:** do not run extra ingestion jobs; let the existing governor pause batches. The archive download itself consumes no D1 rows.
- **ZIP too large for GitHub:** expected; `data-archive` is ignored by Git and should be uploaded to R2, not committed.
