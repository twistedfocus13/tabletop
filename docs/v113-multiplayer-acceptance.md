# v113 browser multiplayer acceptance — verified

Verified 2026-11-23 with GitHub Actions workflow run
https://github.com/twistedfocus13/tabletop/actions/runs/45111330271

## Automated Chromium checks

Both browser tests **passed** on Ubuntu 24.04 using Playwright with Chromium:

1. **Roll20 dock:** Chat, Dice, Players, and Settings tabs switch correctly, and the actual live DOM elements remain unique and available.
2. **GM + two player sessions:** three independent Chromium browser contexts joined a disposable PeerJS room; public chat reached all participants; a player-to-player whisper was visible to its sender, recipient and GM; a whisper to GM was absent from the uninvolved player; and a private GM dice roll appeared for its roller but not the uninvolved player.

The tests serve the checked-out repository locally, not the deployed GitHub Pages URL. No actual campaign data or saved game is used.

## First-run tutorial

Players see an intentional Controls help overlay when they first enter. It must be dismissed before they can use the chat interface. The browser multiplayer test sets `tabletop-seenControls` during setup to isolate communication tests from onboarding; the normal tutorial remains intact.

## Release confidence

- Verified: sidebar component positioning/availability, three-browser PeerJS connectivity, public/private chat privacy, private dice roll filtering.
- Not yet covered: scene unload/reload persistence, checkpoint restore, terrain/fog/light visual differences, mobile browsers, reconnection following a dropped WebRTC session, and full campaign data synchronization.

The workflow runs on relevant pull requests and changes to `main`; it can also be dispatched manually. Browser tests are not a substitute for campaign backups before significant edits.
