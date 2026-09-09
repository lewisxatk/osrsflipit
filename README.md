# OSRSFlipIt

OSRS Grand Exchange flipping dashboard built with React + Vite and designed for free Cloudflare Pages hosting.

## Upgraded features

- Market page defaults to 30 rows with **Load More**
- Search box with **X clear button**
- OSRSFlipIt logo returns to the Market/home page
- Global item search in the top navigation with a scrollable result dropdown
- Item icons throughout the market, movers, watchlist and item analytics
- Item page shows the **GE maximum buy limit**
- Price charts:
  - 24 hours (5-minute detail)
  - 48 hours (hourly)
  - 1 week (hourly)
  - 1 month (6-hour)
  - 6 months (daily)
- Item graph has separate **Buy (black)** and **Sell (red)** lines
- Detailed hover tooltip with date/time and prices
- Relative chart scaling so large item-specific moves are visually obvious
- Match All custom filters with `>`, `>=`, `=`, `<=`, `<`
- Saved, named filter profiles stored in the browser
- Movers expanded to top 50 on each side with price/volume filters
- Clickable alert history that opens the item's 48-hour chart
- Notification bell with pop-out panel and Clear All
- Alert popups appear at the bottom-right for 15 seconds
- GE tax-aware margin, ROI and profit-per-limit calculations
- Local watchlist and alert rules
- Refreshes live market data every 60 seconds

## Data / API key

OSRSFlipIt uses the public RuneScape Wiki real-time prices API at `prices.runescape.wiki`.

**No API key is required.** The API is intended for community tools and exposes bulk latest prices, item mapping, 5-minute/1-hour data and item time-series data. The Wiki asks applications to use a descriptive User-Agent and to avoid excessive polling.

The frontend therefore does not need a secret key or Cloudflare environment variable.

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

The generated production files are placed in `dist/`.

## Cloudflare Pages

For a GitHub-connected Cloudflare Pages project:

- Framework preset: **Vite**
- Build command: `npm run build`
- Build output directory: `dist`
- No environment variables are required for the OSRS Wiki price API.

Push the project to GitHub and Cloudflare Pages will build/deploy it on each push.

## Notes

The Wiki API provides up to 365 time-series points. OSRSFlipIt chooses the most appropriate timestep for each chart range so the 24-hour chart can stay detailed while longer ranges cover more history.
