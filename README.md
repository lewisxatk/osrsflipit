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


## V46.2 build fix
The Vite production build can complete successfully and then fail in `closeBundle`
with `ENOENT: no such file or directory, lstat '/opt/buildhome/repo/media'`.
The build hook now treats `/media` as optional and only copies it when the directory
exists. If branding assets are present in the repository, they are still copied into
`site/media` normally.

## V46.2 Discord configuration sync fix
The Wrangler config now includes the non-secret Discord runtime variables so the Cloudflare dashboard and repository stay in sync:
- `DISCORD_CLIENT_ID`
- `DISCORD_REDIRECT_URI`

Keep these as normal variables. Keep the following as encrypted Cloudflare Worker Secrets only:
- `DISCORD_CLIENT_SECRET`
- `DISCORD_BOT_TOKEN`
- `OSRSHUB_AUTH_SECRET`

Do not commit any secret values to GitHub.
