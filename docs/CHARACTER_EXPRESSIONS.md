# Character Expressions — Design & Implementation Plan

## Goal
Build a guided Expression Manager for assigning six reusable character expressions to a selected Borealis character. Support both individual image files and a single expression sheet.

## Workflow
1. **Welcome:** Templates or Edit character expressions.
2. **Templates:** explain both formats and let the user save a copy of an Individual Template or Sheet Template without altering the original.
3. **Choose character:** select an existing character from Characters.
4. **Import:** individual mode accepts multiple images and allows visual assignment; matching filenames can suggest slots. Sheet mode crops a known 3-column × 2-row layout. Third-party sheet layouts will eventually need adjustable crop regions.
5. **Review:** six gallery cards resembling Avatar Composer: Neutral, Smile, Smirk, Angry, Crying and Flushed. Each card has an Edit/Replace action and the user can go back.
6. **Save:** only after explicit confirmation. Require all six slots; do not overwrite existing saved expressions before the final save action.

## Storage
- IndexedDB, separate from the global Resources library.
- Stable expression ID, character ID, slot key, label, MIME type, filename and update timestamp.
- Store image bytes as Blob, never object URLs.
- Save all six in one transaction and replace only the selected character's expressions. Leave other characters and original imported assets untouched.
- Folder placement does not define expression ownership; character association is explicit.

## Canonical slots
- neutral — Neutral
- smile — Smile
- smirk — Smirk
- angry — Angry
- crying — Crying
- flushed — Flushed

## Composer integration (follow-up)
Connect the existing selector to saved images for the active character. Preserve the current OpenMoji choices as fallback when a character has no custom expressions. Revoke generated object URLs when no longer needed.

## Resource explorer (separate follow-up)
Add folder creation, rename, delete and move operations to Resources. Folder organization must remain independent from expression-to-character relationships.

## Current implementation
- `src/characters/characterExpressions.storage.ts` contains canonical slots and IndexedDB save/list/blob/delete functions.
- `src/characters/ExpressionManager.tsx` contains the guided import/review workflow.
- Composer integration and adjustable cropping for arbitrary sheet layouts remain follow-up work.
