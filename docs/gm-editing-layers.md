# GM editing layers — interactive version

The vertical reference-style palette now changes which objects a GM can interact with on the tabletop. This is a **development branch**, not a deployment to the live game.

| Editing mode | Canvas behavior |
|---|---|
| **Tokens** | Select and drag minis; hidden GM minis are locked out of ordinary token editing |
| **GM** | Select and position GM-controlled NPCs (including hidden minis); cannot drag player-owned minis |
| **Map** | Pick a board by clicking its map, or use the native map image, terrain paint, and board drag controls |
| **Layers** | Switch the GM-viewed layer without accidentally moving tokens; moving the party still requires confirmation |
| **Fog** | Left-click and drag a 1–5-cell brush to paint or erase opaque player fog; GM sees translucent overlay |
| **Light** | Left-click to place a colored point light with adjustable radius; click near existing lights in remove mode |

## Save and synchronization behavior

- GM-painted fog and light placements belong to the game state, and are sent to players **only for their currently visible layer**.
- The fog mask covers the map for players. Hidden NPCs are excluded by the existing game visibility rules.
- Fog and light objects are saved as local offsets when boards are saved to Places or a campaign scene snapshot.
- Moving a board also moves its associated fog and lights. Closing a persistent campaign scene saves the fog and lights and reopening restores them.
- **No new per-player dynamic sight/radius system** is implemented. Point lights illuminate scenes visually but do not independently reveal hidden fog squares.
- Keep the original dungeon fog system and its reveal rules separate from GM-painted fog.

## Manual acceptance checklist (requires GM plus player browser)

1. Start a GM room. Confirm the left toolbar is visible only to the GM and not during player preview.
2. Select **Tokens**, move a normal mini and check WASD movement. Confirm a hidden secret NPC cannot be selected with Tokens.
3. Select **GM**, drag a GM NPC and hide/reveal it. Confirm a player-owned mini cannot be dragged in GM mode.
4. Select **Map**, click an empty map area: the board becomes selected, **without moving the selected mini**. Paint terrain using the native terrain tools.
5. Select **Layers**, click empty map space: nobody moves. Switch the GM view to another layer and confirm the player still sees their current location. Moving the team must still request confirmation.
6. Select **Fog**, paint squares over a distinctive feature with a brush size of 1, then 3. In the player window the area should be opaque; the GM sees translucent fog. Erase several squares and verify they become visible.
7. Select **Light**, choose a color and radius, place a light, and check scene illumination in both windows. Switch to Remove nearest and delete it.
8. Move the board a few squares. Verify fog and lights move along with it.
9. Save the board, unload it if safe, reopen and verify fog and lighting positions persist. Test checkpoint export/restore in a disposable game.
10. Refresh both browsers. Ensure no hidden-layer light or fog data appears to players and no console errors occur.
11. Check keyboard and mouse controls in all six modes; ensure UI input fields still receive their normal keystrokes.

These checks have **not** been performed in a real multiplayer browser yet. Keep the PR in draft pending acceptance.
