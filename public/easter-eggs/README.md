# THE LAMBDA — optional local audio asset

The visual easter egg works without any audio file.

To enable its soundtrack, supply a clip you are entitled to use at this exact path:

```
public/easter-eggs/path_of_borealis_clip.mp3
```

The clip should be **10 seconds or less**, starting at the point you want heard.
The game does not download audio or extract it from any existing soundtrack.
Avoid committing copyrighted music to a publicly distributed repository without the necessary rights.

The animation caps playback at **9.5 seconds**, fades the sound in over 1.9 seconds, and fades it out over the last 1.5 seconds. Closing with Esc or Skip stops playback.

After adding the file, run `npm run build` or `npm run tauri dev` to test it.
