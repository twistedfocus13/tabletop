# Chapter 1 original-map import — test checklist

The Chapter 1 scene browser is **development-branch only** until this pull request is reviewed and merged.

## First map smoke test
1. Open a local preview of the development branch, start a GM room, and open **Places** at the top.
2. Select **Chapter 1 — Earthquake at Woodland Base** and find the card for **Chapter 1 Fissure Cave 20x20**.
3. Click **Import original PNG**, select `Chapter_1_Fissure_Cave_20x20.png` from the provided original-maps ZIP.
4. The existing tabletop reads and JPEG-compresses the selected PNG (to a maximum dimension of 2048 pixels); it creates a new GM layer and saves the map to the browser's existing Saved Places storage.
5. Confirm the original board remains untouched, the new map is correctly sized at 20×20, and players remain on the previous live layer.
6. Click **Open saved scene**. It must reopen the existing saved board instead of duplicating the scene.
7. Refresh the GM browser and reopen the saved scene. Confirm that the picture and saved place are retained.
8. Open the normal Places menu and confirm unrelated saved boards still work.
9. Connect a second browser as a player and ensure imported GM layers are not automatically shown to players.
10. Verify that selecting the wrong image ratio is rejected without creating a board, and that the twentieth-layer limit is enforced.

## Known limitations
- The PNG itself is **not committed into GitHub**. It must be selected locally during the one-time import.
- The existing tabletop generates an optimized JPEG copy from the original image on import.
- Imported maps are stored in the GM's browser, not cloud-synced. Browser data must be backed up before clearing site data or changing computers.
- Saved Places currently capture a **template snapshot**; later changes to placed copies are not automatically written back to the library. Full per-scene persistence and named checkpoints still need implementation.
- The scene browser lists Chapter 0–10 even though unlocking and discovery filtering are not implemented yet. It is GM-only; players do not see the library.
- Story synchronization from the campaign website is not active yet.
- The site may still have 20 simultaneously loaded layers. Don't delete a layer containing important game changes before making a backup.

## Release gate
Keep PR #1 draft. Test in two browsers and confirm preexisting saved boards and multiplayer still function before merging. No live publication approval has been given.

## Dynamic progress bar checks (new)
- Open the GM Places panel; no operation progress should be shown until an operation begins.
- Import a valid Chapter 1 PNG. The bar advances on actual completion of decode, validation, board creation, and saved-place creation (not a fake timed animation), ending at 100%.
- Create a checkpoint. Progress must reflect capture, asset-read, assembly, and saved checkpoint verification.
- Export a backup. The bar must show encoding and download-request completion; 100% means the browser was asked to download, **not** that the file has been verified on disk.
- Import a JSON backup; ensure file decoding is represented before the guarded restoration process begins.
- Restore with no players connected: ensure safety checkpoint, asset restoration, and state restoration steps update the bar.
- Test error paths and confirm the bar displays an error rather than remaining misleadingly at a previous successful completion.
- Confirm the progress label is announced via `aria-live` and the underlying HTML `progress` element is accessible.

**Limitations:** Percentages reflect completed workflow milestones, not precise bytes transferred. Full two-browser regression and recovery testing are still outstanding; keep the PR in draft.
