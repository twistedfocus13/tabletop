# Voice of the Forest — tabletop scene library foundation

This is a **data-only, non-live** foundation. No changes to the existing board, multiplayer, save code, or player UI have been made.

## Source of truth
- Published campaign repo: `twistedfocus13/thevoiceoftheforest`.
- Chapter titles and published story status originate from its `js/content.js` `CHAPTERS` array.
- Story synchronization is **planned**, not yet active: the source site needs a published, player-safe JSON feed before this tabletop can automatically check and import story updates.
- Never sync unpublished GM secrets or derive unlocks from published statuses.

## World model
- Chapter references scene IDs; the same scene can be referenced by multiple chapters without cloning world state.
- Distinct versions of a map require distinct scene IDs.
- The GM owns chapter unlocking, discovery, current party location, and travel authorization.
- Every scene persists; party state must stay separate from scene state.
- Autosave plus named checkpoints and export/import are future features, and must not be claimed until implemented.

## First map set
- Chapter 1 includes 11 named Fissure Cave maps (4 small, 4 medium, 1 large, 2 boss) from original generated PNG filenames.
- Twilight Falls has 3 named 25×25 maps.
- `asset: null` means the image has **not yet been committed to this repository**. The original PNG must be added before a map can be opened.
- Grid counts are from the original map filenames, not verified geometric pixel alignment.
- Existing tabletop supports up to 20 loaded layers; saved scene state must be unloadable without deletion.

## Implementation milestones
1. Validate the manifest and commit original map assets on this branch.
2. Implement scene template loading as an additive, GM-only section of the existing Places UI.
3. Add chapter unlock/discovery state and player-safe visibility filtering.
4. Implement persistent per-scene state, safe unloading, autosave, checkpoints, and restore testing.
5. Publish a versioned player-safe story JSON file from the campaign website and implement resilient sync.
6. Test existing rooms, multiplayer visibility, saved boards and rollback before merging.

Nothing in this foundation should be interpreted as permission to publish, move players, unlock chapters, or modify campaign progress automatically.
