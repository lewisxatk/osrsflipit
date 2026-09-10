# OSRSFlipIt V12

This build is based directly on the uploaded `osrsflipit-updated-v11(1).zip` source.

## Included
- Exact 24h volume from the OSRS Wiki `/24h` endpoint, used in Market/Screener and sortable/filterable.
- Flip Score /100 using ROI, margin, 24h volume and GE-limit liquidity.
- New Finance page with completed flip log, realised P&L, bankroll-per-slot allocator and smart flip suggestions.
- New Calculators page with live-price set assembly/disassembly and potion decanting calculations.
- Standard profiles replaced with price bands and High Volume.
- Mobile-friendly finance/calculator layouts.
- Item chart alert creation now opens as a real new alert rather than an invalid edit record.

## Build
Cloudflare Pages settings:
- Build command: `npm run build`
- Output directory: `dist`
