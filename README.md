# OSRS Hub V46.2

Combined UX, reliability, Discord account alerts, graph intelligence, SEO and branding update.

## Protected architecture
- Normal Cloudflare Worker + Worker Assets
- `worker.js` + `wrangler.jsonc`
- D1 binding `DB`
- Assets binding `ASSETS`
- `/api/*` Worker-first routing
- Discord OAuth routes/session handling
- D1 `users` and `user_data`
- Cloud sync keys

## Discord setup
Add `DISCORD_BOT_TOKEN` as an encrypted Cloudflare Worker Secret. Never commit or paste the token into this repository.

For user-installed Discord notifications, enable **User Install** in the Discord Developer Portal and use the application's install link from OSRS Hub Alerts. Users install OSRS Hub to their own Discord account; no OSRS Hub server or webhook is required.

## Branding/media
See `/media` for OSRS Hub logo and social-preview assets.

## SEO
- `robots.txt`
- `sitemap.xml`
- OpenGraph/Twitter metadata
- JSON-LD WebApplication metadata
- OSRS Hub brand/title/description metadata

If the final custom domain is different from `https://osrs-hub.com/`, update the canonical/OG URLs in `index.html` and the sitemap before launch.
