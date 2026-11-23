# GM editing-layer toolbar

The toolbar is designed after the requested compact vertical editing-layer picker. It is **GM-only** and hidden in player preview. It reuses the established tabletop tools, access control, and game state. It does not create a second independent set of layers.

| Mode | Existing tabletop functionality |
|---|---|
| Tokens | Select, move and edit Pokémon minis in the Minis tab |
| GM | Hide/reveal the selected mini; add a hidden board area |
| Map | Import a background image, edit painted terrain, enable existing board-moving tool |
| Layers | Switch the GM's viewed layer, create a new layer and request player travel with the existing confirmation |
| Fog | Show current dungeon reveal controls and existing fog/terrain settings |
| Light | Change global background/ambience from the existing floor backdrop choices |

**Not yet supported:** independent token/map/GM object edit permissions within the same board, polygon fog painting, and positioned dynamic light sources. These are not implied by the buttons.

## Acceptance checks

1. Sign in as GM. The six-mode toolbar should appear on the left; player and GM-preview views must not show it.
2. Select **Tokens**; confirm existing minis tab and WASD/Space movement still work.
3. Select **GM**; hide a selected NPC, confirm it disappears for the player but remains accessible to the GM; unhide it.
4. Select **Map**; choose an image using Map image, switch to Terrain and paint a cell, then turn Paint off before moving minis. Verify that board moving uses the existing control.
5. Select **Layers**; change the GM view and verify the player remains on the old layer. Test + New layer. Choose Move players here and ensure the existing confirmation appears.
6. Select **Fog**; confirm native dungeon floor reveal settings work and existing authorization still applies.
7. Select **Light**; change ambience, then confirm existing backdrop updates and persists.
8. On a narrow/mobile screen confirm the palette does not cover essential controls.
9. Reload and confirm the currently chosen editing mode is retained for that tab session.
10. Verify older sections of the native GM panel still work as before.

No full multiplayer browser regression has yet been performed; keep the PR open for review.
