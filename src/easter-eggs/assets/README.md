# Easter egg assets

All Easter egg media stays in `src/easter-eggs/assets/`.

## THE LAMBDA (egg 003)

Place your own excerpt here, with this exact filename:

```
src/easter-eggs/assets/path_of_borealis_clip.mp3
```

The cinematic now adapts to the clip's actual metadata duration (up to a 30-second safety cap). Your **13-second excerpt plays through to its end**: volume fades in over the first 1.9 seconds and fades out during the final 1.5 seconds of the track. The blurred overlay and lambda animation follow the same duration. Skip or Esc immediately stops playback.

The MP3 is **optional**: if you have not added it, BRS compiles and the visual cinematic runs silently for 13.5 seconds.

## THE LAMBDA animated collectible

The third Collections sticker uses your animated file:

```
src/easter-eggs/assets/ee_03.gif
```

Its card and full-size holographic viewer display the actual GIF animation. The GIF is optional until you supply it; when absent, Collections displays a lambda glyph placeholder instead. Add the file to this folder before running `npm run build` or `npm run tauri dev`.

Use only audio and artwork you have permission to use. The MP3 is ignored by Git and should not be committed to a publicly shared repository without appropriate rights.
