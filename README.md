# OSRS Hub — V35

## V35 fixes + quick calculator
- Added a desktop-only quick profit calculator beside Notifications in the header.
- Enter buy price, sell price and quantity; it shows profit per item, total profit, total invested, total GE tax, sell total and ROI. Supports values such as `10k`, `2.5m` and comma-separated numbers.
- Calculator needs no item search and is intentionally fast for manual flip checks.
- Hardened startup with a visible boot screen so a failed module/deployment cannot leave a completely white page.
- Added an app-mounted state and error-boundary fallback so recoverable React errors surface instead of being hidden behind the boot screen.
- Made the theme preference read through the safe local-storage helper.
- Corrected exported backup metadata to V34.

## Build
```bash
npm install
npm run build
npm run dev
```

## Data
Live Grand Exchange data comes from the OSRS Wiki prices API. Historical and money-maker tooling uses the OSRS Wiki where supported.

## Checks
- TypeScript parser check of `src/main.jsx`: PASS
- ZIP integrity (`unzip -t`): PASS
- Dangerous dynamic-code scan (`eval`, `new Function`, `innerHTML`, `document.write`, `javascript:`): PASS
- Full Vite production build was not executable in this offline environment because npm dependencies are not cached; Cloudflare's build is the authoritative production check.
