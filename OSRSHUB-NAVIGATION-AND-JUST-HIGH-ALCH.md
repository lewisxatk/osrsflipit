# OSRS Hub — Just High Alch and navigation consolidation

## Included
- New `Just High Alch` route at `/just-high-alch`, with an alch profit scanner sorted descending by profit per cast.
- Profit calculation uses the item's current instant-buy side, one nature rune, and optionally five fire runes when the user disables the fire-staff setting. Alching itself has no GE sell tax.
- Configurable minimum profit per cast, minimum daily volume, maximum item buy price, F2P-only filter, item search and price-history graph for the selected item.
- A desktop-only Quick Tools pop-out with High Alch lookup, item lookup and navigation shortcuts.
- Main navigation simplified around Home, Trading Terminal, Account Studio, Dashboard, OSRS Brain, Analysis, Just High Alch, Recipes, Watchlists, Alerts and Money Makers.
- Account Studio now contains tabs for Account Tracker, Loadout Studio, Quest Progression and Calculators.
- Dashboard includes an Overview / Flip & Finance tab switch.
- Market Radar is rendered at the bottom of Analysis; Historical Margin Scanner remains within OSRS Brain.
- Screener, Historical Backtester, Tools & Utilities, Market Spotlight and Command Centre remain in source and retain their routes but are removed from visible navigation.

## Safety boundaries
`worker.js`, `wrangler.jsonc`, migrations and Discord integration were not intentionally edited. The page uses the existing `/api/prices` endpoints and existing loaded item metadata; it does not invent historical prices.
