# OSRS Hub — Watched-inspired test redesign

## Scope
- Applies only to `feat/combat-studio-engine-intelligence` (the test build).
- The production `main` branch is not modified or merged.
- The redesign is presentation-only: existing market, trading, account, combat, data, navigation and calculation flows remain in place.

## Reference direction
The reference is Watched (watched.earth): an experimental satellite-tracking experience recognised for its bold condensed display typography, delicate italic serif contrast, technical monospaced labels, deliberate spacing and immersive data visualisation. Its full live interface requires JavaScript and WebGL, so the public text-only inspection does not expose every interactive detail. This implementation follows the observed visual language rather than copying its assets or exact layouts.

## Single theme tokens
- Canvas: `#090A0B`
- Secondary canvas: `#0E1112`
- Panels: `#141819`
- Warm white: `#F4F1EA`
- Muted text: `#A6AAA6`
- Structural lines: `#353C38`
- Signal orange: `#FF6A24`

One fixed theme is applied before the app boots. Theme selection controls are removed from the navigation and command palette.

## Typography and controls
- Condensed uppercase display typography for major headings.
- Monospaced labels for market telemetry, stats, prices and metadata.
- Italic serif accents reserved for selected headline emphasis.
- Square-cornered warm-white secondary controls with dark text.
- Orange primary actions, selected states and live status markers.
- High-contrast warm-white body text; muted grey is reserved for secondary information.

## Data visualisation
- Trading Terminal buy series: warm white.
- Sell series and volume accents: signal orange.
- Grid and axes: restrained graphite and muted grey.
- Tooltip surfaces: dark graphite with high-contrast text.
- Existing chart data, scales, range controls, tooltips and pointer interactions are retained.

## Coverage
- Global navigation, page headings, market tables, filters, cards, forms, overlays and mobile navigation.
- Trading Terminal charts, controls, telemetry and mini-history.
- Combat Studio panels, metrics, gear paperdoll, gear table, quest controls and detail overlays.
- Mobile breakpoints and reduced-motion preference.

## Validation
The redesign uses a dedicated stylesheet imported after the existing global styles and again after Combat Studio styles. The current test branch receives its own Cloudflare preview; do not merge this branch into production until the user has reviewed it.
