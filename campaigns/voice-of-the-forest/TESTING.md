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

## Keyboard movement / jump controls
- Select a movable mini and press arrow keys or WASD. Each key press should request exactly one grid square through the existing authoritative `move` action.
- Hold a direction: repeat at most about once per 120 ms; no teleporting or skipping blocked squares.
- Test walls, fog, occupied spaces, board edges, turn restrictions, and player ownership. All must respect the same movement limits as clicking.
- Space gives a purely **visual jump**, synchronized to connected players. It does not move the mini across terrain or evade traps.
- Ensure keys do not activate when typing in input/textarea/select, while editing content, or when the game is not open.
- Test GM and player views separately. Check that A and D no longer trigger attack/dash shortcuts (those formerly conflicted with WASD).
- Test 3D and sprite minis, and check the jump ends at the normal ground elevation without cumulative vertical drift.
- Multiplayer browser regression testing is still required before merging.

## Persistence and multiplayer regression pass (follow-up branch)
### Automated/isolated logic
- Scene snapshots: terrain, traps, GM-owned Pokémon/NPC positions and HP persist; player-owned party figures are excluded from templates.
- Scene unloading: reject the current live layer or any scene with a player-owned Pokémon.
- Template protection: `boardPlace` must return the already-open scene board ID for an imported campaign scene rather than spawning a duplicate.
- Backup assets: ensure pending map writes and missing scene images cannot silently create incomplete checkpoints.
- Export/import: verify binary model bytes survive JSON serialization and rehydration.
- Player view: current-layer boards only; no saved-board library or unrevealed scene templates sent to clients.

### Two-browser acceptance scenario (requires a GM and a player session)
1. **Before testing**, create a named checkpoint and export a downloadable backup; verify the JSON file is present.
2. Connect a separate player browser to the GM room. In the GM-only Places panel, import a Fissure Cave map and confirm the player cannot see it while the team remains on another layer.
3. Place one GM-controlled NPC in that scene, set a distinctive HP value, paint a wall and hidden trap, and save the game. Confirm the player does not see those prep changes.
4. Close/reopen the GM-only scene and check the NPC HP, terrain and trap return without extra duplicate NPCs; repeatedly open the scene card to ensure it does not add layers.
5. Try to close the scene while the party is there; verify the action refuses. Move the party to a safe layer through the existing GM travel control, then save/close/reopen and verify world changes persist.
6. With the player disconnected, create a checkpoint, make changes, restore it, and confirm both the state and map artwork reappear correctly. Test a JSON export/import round trip using a disposable test game, **not the primary campaign**.
7. Reconnect the player. Check that only the current layer appears, enemies on GM-only layers are absent, and normal WASD movement / Space animation still synchronize.

**Release gate:** The tests above are required before merging these follow-up hardening changes. No actual two-browser verification has been performed by the assistant.
