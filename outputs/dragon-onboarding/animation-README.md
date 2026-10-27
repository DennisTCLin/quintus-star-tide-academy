# Brand dragon animation delivery

Generated via Higgsfield Seedance 2.5 from the site's existing public brand mascot. No child photo, name, account details or voice was uploaded.

## Runtime files

Copy the five named MP4s and five `*-poster.webp` files into `public/assets/dragon-guide/`.

| State | Visible action | MP4 bytes | Poster bytes |
|---|---|---:|---:|
| welcome | Existing lower fin waves twice; eye blink | 90035 | 19242 |
| listening | Head/ear-fin tilt, attentive blink | 98236 | 19802 |
| thinking | Eye looks up, brow expression, blink | 77279 | 19738 |
| speaking | Distinct mouth opening/closing with blink | 80560 | 21768 |
| cheering | Happy nod, closed-eye smile, fin lift | 90181 | 18630 |

All videos: H.264/yuv420p, 480×480, 24 fps, 4.041667 seconds, faststart, no audio stream. Five videos total 436291 bytes; posters 99180 bytes; all runtime media 535471 bytes.

## Verified

Eight time-sampled frames per state were visually inspected. The same illustrated cyan dragon bust, pale face, teal fins and gold stars remain recognizable in all states. These are genuine facial/fin/head animation, not a static image translated with CSS. There are no added human hands, text, captions or scene cuts. Background is dark navy and opaque; these are not alpha sprites. The speaking clip is a generic talking state and does not claim phoneme synchronization with TTS.

Playback must follow the active UI state, pause offscreen/hidden, respect reduced motion, and retain a static fallback when playback fails. Do not preload all five videos at startup.

## Provenance

`generation.json` records requested prompts, public reference, original job IDs and 140-credit estimate. `job-results-complete.json` has returned source URLs. `original/` contains 960×960 source MP4s. `prepare-assets.py` deterministically compresses runtime copies and extracts posters/contact sheets. `delivery.json` records ffprobe results. Source videos and QA sheets do not need to ship.

