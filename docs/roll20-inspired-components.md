# Roll20-inspired tabletop components — v113

This interface uses the uploaded Roll20 screenshots as visual and interaction references. It does not copy Roll20 source code, proprietary graphics, or third-party assets.

## Reused tabletop features
- **Left:** existing GM editing-layer toolbar, plus compact shortcuts for selection, panning, terrain, area measurement, ping, dice, and settings. All invoke existing controls.
- **Right:** dark icon tabs for Chat, Dice, Players, Scenes, and Settings.
- **Chat:** the live original conversation log is moved into the dock (never cloned). It scrolls, preserves chat history and roll events, and keeps the original input and Send button wired.
- **Dice:** the native tabletop dice control section is moved into its own tab. Dice results display a distinct result badge in chat.
- **Players:** the existing online/away player list plus a copyable campaign invitation link.
- **Scenes:** links to existing GM Places and Boards tools.
- **Settings:** existing GM tabs and rules, retaining the native configuration forms.

## New chat commands
- `/roll 1d20` and `/r 2d6`: public dice rolls.
- `/gmroll 1d20` and `/gr 1d20`: private roll to the GM and the roller.
- `/w gm message`: private message to the GM.
- `/w "Player Name" message`: private message to that named player, with sender and GM visibility.
- Supported dice: d4, d6, d8, d10, d12, d20, d100, count 1–20.

The host resolves private-chat recipients. Other players do not receive whispers over the multiplayer connection.

## Browser acceptance checklist
1. Reload the site and confirm version 113.
2. Join as GM. The compact vertical editing rail and right-side tabs should appear; existing scene library and navigation continue to work.
3. Use Chat. Send a normal message, roll `/roll 1d20`, and verify the result badge appears in both GM and player windows.
4. Use `/gmroll 1d20`; only the roller and GM should receive the result.
5. Whisper to the GM and then to a named test player; verify a third player cannot see the messages, including after reconnecting.
6. Click Dice: the native dice controls should roll normally, with 3D dice still usable.
7. Click Players: ensure names and away statuses update, and the correct room invitation URL is shown.
8. Click Scenes: open Places and move the GM view without moving the party.
9. Click Settings: all native GM tabs should remain reachable.
10. Verify the existing toolbar's Tokens, GM, Map, Layers, Fog and Light controls, plus keyboard movement.
11. Test sidebar resize, hide/show, narrow screens, chat log scrolling, and messages arriving during another tab.
12. Confirm browser refresh retains sidebar tab selection, without losing game state.

**Verification performed:** JavaScript syntax and static integration checks. **Not yet performed:** an actual multiplayer browser regression and production visual rendering test.
