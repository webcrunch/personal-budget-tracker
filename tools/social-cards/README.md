# Link-preview card and icon sizes

The image that shows when a link to the site is shared (Open Graph / Twitter card, 1200 × 630),
and the favicon's smaller sizes. Both are rendered with Playwright into `frontend/react-app/public/`:

- `budget.html` + `card.css` → `og-budget.png`
- `money_bag.png` (512 px) → `favicon-32.png` and `apple-touch-icon.png` (180 px, white background)

Change the HTML or `card.css`, then run `node tools/social-cards/render.mjs` with Playwright
installed (or `PLAYWRIGHT=<path to another project's node_modules/playwright>`). The tags that
point to the card and icons are in `frontend/react-app/index.html`.
