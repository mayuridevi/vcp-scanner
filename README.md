# VCP Scanner (PWA)
Scans NSE stocks for Minervini-style VCP: pullbacks are counted from the LAST candle backwards (right → left) and must keep shrinking.
**BUY** when the latest close is above the high of the last completed candle (VCP line). **WATCH** = pattern formed, no close above the line yet.

## Deploy on GitHub Pages
1. Create a repo, upload everything in this folder (keep `data/` and `icons/`).
2. Put your NSE CSVs in `data/` (see `data/README.txt`) — or use *Import CSV…* in the app.
3. Settings → Pages → Deploy from branch → `main` / root. Open the URL in Chrome → Add to Home screen.

## Prices
Yahoo Finance via a CORS proxy (corsproxy.io / allorigins). For reliability deploy `worker/worker.js` on Cloudflare Workers (free) and choose "My Cloudflare Worker" in the app.
