# R44 — Workspace redesign

- Reasserted compact top navigation and removed the desktop sidebar from the desktop layout.
- Expanded the main workspace to full width.
- Restyled Trading Terminal and Loadout Studio cards for the supplied mockup direction.
- Added a responsive skill-training planner to Quest Pathway with target level, XP remaining, budget cap, and ranking modes for fastest / AFK / cheapest / balanced.
- Added reduced-motion-safe hover and entry transitions.
- No database migrations or Worker API changes.

Validation: Node test suite and TypeScript JSX parser are run separately; Vite production build could not be run in this environment because npm dependency installation timed out. Training figures are labelled estimates, not verified best-method claims.
