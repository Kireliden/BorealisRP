# Easter egg assets

All Easter egg media stays in `src/easter-eggs/assets/`.

## THE LAMBDA (egg 003)

Place your own excerpt here, with this exact filename:

```
src/easter-eggs/assets/path_of_borealis_clip.mp3
```

The clip should be no longer than 10 seconds, starting where you want playback to begin. The animation stops at 9.5 seconds, fades in during its first 1.9 seconds, and fades out for its final 1.5 seconds. Skip or Esc stops the sound immediately.

The MP3 is **optional**: BRS compiles and the cinematic runs silently without it. Once you add the file, Vite will bundle it when you run `npm run build` or `npm run tauri dev`.

Use only audio you have permission to use. This file is ignored by Git and should not be committed to a publicly shared repository without the appropriate rights.
