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

---
# Stage 2: cloud copy (Supabase)

New file `cloud.js` (no libraries, plain fetch), new "Cloud" card in Stats (above Data). `app.js` is not changed in this step.

- **Sign in / Create account** with email + password. Session is stored in its own key `adet_auth`, never inside backups.
- **Upload to cloud:** shows what this device has, then adds/updates it in the database, then reads everything back and verifies. Idempotent (running it twice creates no duplicates). Never deletes anything locally or in the cloud.
- **Restore from cloud:** loads the cloud copy into the existing import screen (preview, Replace needs two taps, automatic `streak2_preimport` snapshot, or Merge).
- Local ids are kept as `legacy_id` in the database, so every device uses the same ids.
- `sw.js`: only change is adding `cloud.js` to the offline file list.

Supabase: run `supabase/patch_1.sql` once (fixes indexes so upsert works, adds `legacy_key` for sessions).

Not yet (next step): automatic two-way sync, deletions propagating between devices.

---
# Stage 3: automatic two-way sync

`cloud.js` rewritten; `app.js` got two tiny hooks (call sync after `save()`, reset the sync baseline on import-Replace). Local data format is unchanged. No new SQL.

## How it works
- Sync runs: when the app opens, when you return to it, when the network comes back, ~2.5 s after any change, and with "Sync now".
- 3-way merge per item (habit, task, check-in, focus session) between this device, the cloud and a baseline of the last sync (`adet_base`, not part of backups).
- Merge rules: only one side changed -> that change wins; edit beats delete (nothing is lost); two different check-in values -> the larger; two different edits of one habit/task -> this device wins; task order follows whoever reordered.
- The running Focus timer stays on the device.

## Safety
- A device with no baseline never deletes anything (it only adds).
- If a sync would remove many habits/tasks/check-ins (here or in the cloud) it **pauses** and asks. Cloud emptied -> offer to restore the cloud from this device.
- Snapshot to `streak2_preimport` before the cloud removes anything locally.
- Sync is off while saved data is unreadable (`streak2_corrupt` case).
- Import -> Replace resets the baseline, so a Replace can never delete cloud data.
- "Upload this device to cloud" and "Restore" stay as manual recovery tools.

## Known limits
No live push between open devices (changes arrive on next open/return/Sync now); habit order is not synced after creation; a habit's schedule change still applies to past days (audit B7).
