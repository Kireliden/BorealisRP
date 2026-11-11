# Easter egg assets

All Easter egg media stays in `src/easter-eggs/assets/`.

## THE LAMBDA (egg 003)

Place your own excerpt here, with this exact filename:

```
src/easter-eggs/assets/path_of_borealis_clip.mp3
```

The cinematic now adapts to the clip's actual metadata duration (up to a 30-second safety cap). Your **13-second excerpt plays through to its end**: volume fades in over the first 1.9 seconds and fades out during the final 1.5 seconds of the track. The blurred overlay and lambda animation follow the same duration. Skip or Esc immediately stops playback.

The MP3 is **optional**: if you have not added it, BRS compiles and the visual cinematic runs silently for 13.5 seconds.

## THE LAMBDA collectible (egg 003)

The third Collections sticker currently uses:

```
src/easter-eggs/assets/egg_003.png
```

This is the temporary static artwork while the animated holographic treatment is on hold. Existing GIF support in the holographic viewer remains available for future eggs.

## THE PLUMBOB (egg 004)

Type the standalone word `sims` (case-insensitively) in an editable field to unlock the fourth collectible, display its reveal, and unlock both palettes of the **Emerald Collection** in Settings → Themes.

The fourth Collections sticker and its reveal use:

```
src/easter-eggs/assets/egg_004.png
```

Its artwork is bundled with the app. No external audio is required.

Use only audio and artwork you have permission to use. The MP3 is ignored by Git and should not be committed to a publicly shared repository without appropriate rights.

## Theme rewards: Emerald Collection

- `Emerald Glade` — light palette with jade/soft green accents.
- `Emerald Nocturne` — dark palette inspired by the Plumbob reveal's green Skip button.

The pair is visible but locked before `the-plumbob` is discovered; after that, both are selectable and available as the light/dark pair in Follow system. The unlock remains saved in the existing Collections store.
