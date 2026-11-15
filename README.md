# ADET

Habit tracker, tasks and focus timer. Installable PWA (vanilla JS, no build step, no dependencies).

## Run locally
Serve the folder with any static server, for example `python3 -m http.server 8080`, and open http://localhost:8080 (the service worker works on localhost and https).

## Files
- `index.html`, `style.css`, `app.js`: the whole app
- `sw.js`: offline support (network first, cached copy when offline)
- `manifest.webmanifest`, `icon*.png`, `icon.svg`: PWA install metadata

## Data
Everything is stored in the browser: `localStorage['streak2']`.
Backups: Stats, Data, Export backup / Import backup (JSON).
Safety copies created automatically:
- `streak2_corrupt`: raw text kept if the saved data could not be read
- `streak2_preimport`: snapshot taken right before an import

## Versioning
After changing `style.css` or `app.js`, bump `?v=` in `index.html`.

## Roadmap
See `ADET_TECHNICAL_AUDIT.md` (Supabase sync, iOS app).
