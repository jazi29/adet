# ADET: stage 0 + 1 changes

Design, layout, habit/stat/focus logic, data format (`streak2`) and `sw.js` are unchanged.

## Stage 0
- Name: `<title>`, `apple-mobile-web-app-title`, manifest `name`/`short_name` -> ADET
- Backup file name `adet-backup-<date>.json`, share title "ADET backup" (backup JSON format unchanged, old backups import fine)
- README.md written, .gitignore added
- Cache bust `?v=20` -> `?v=21`

## Stage 1 (data safety)
| Audit # | Fix |
|---|---|
| B1 | Unreadable saved data is copied to `localStorage['streak2_corrupt']` before anything can overwrite it; a toast tells you |
| B2 | `save()` shows "Could not save. Export a backup now" when the browser refuses to write |
| B5 | Import -> Replace needs a second tap; a snapshot is saved to `streak2_preimport` before Replace and Merge |
| I1 | Ids are restricted to `[A-Za-z0-9_-]{1,64}` and made unique, on load and on import (blocks HTML injection) |
| I2/I3 | Import validates log keys (YYYY-MM-DD) and values (positive integers), dow (unique ints 0-6), sessions (date, minutes 1-1440, habit must exist) |
| T7 | Diagnostic line hidden; shown only with `?debug` in the URL |

Also: non-array/non-object data in storage no longer crashes the app on load.

## Not done yet (later stages)
B3 tabs sync, B6 createdAt, B7 schedule history, B8/B10 dates, PWA/a11y items, everything Supabase/iOS.

## Deploy notes
- Copy the files over the repo, commit, push (Vercel deploys). The service worker is network-first, so the phone picks up v=21 on next open.
- The home-screen icon keeps its old name ("Habits"). Do NOT delete and re-add it: on iOS that creates an empty new storage container. Rename it manually in Home Screen edit mode if desired, or re-add only after exporting a backup and importing it into the new one.
