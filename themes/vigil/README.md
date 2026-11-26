# Vigil

A dark theme for Claude Code, for a city that needs watching. Low storm cloud hangs over a rain-soaked skyline of art deco towers with floodlit crowns, gothic spires, a cathedral, a domed hall and old walk-ups with water towers and fire escapes, framed by a gothic clock tower.

![Vigil: a gothic city at night in the rain](../../previews/vigil/vigil-scene.jpg)

Vigil comes in two parts:

- **The city and the colors** draw in the **Claude desktop app** and the **Claude mobile apps**.
- **In a terminal**, Vigil is a color theme. A terminal can't draw the city, but it can take the palette: run `/theme` and pick **Vigil**.

Claude Code on the web draws neither.

## Install

At the prompt of a Claude Code session in a terminal:

```
/plugin install vigil --marketplace Raul8900/theme-studio
```

Answer `y` to add the marketplace, then press Enter for the user scope. From a shell:

```
claude plugin install vigil --marketplace Raul8900/theme-studio
```

In the desktop app, where `/plugin` doesn't run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `Raul8900/theme-studio`, then **Add plugin**.

A theme installed at the user scope from a terminal also loads in the local sessions the desktop app starts, and draws there. A cloud session viewed in a browser doesn't draw it.

## Three backdrops, one palette

| Backdrop | What you see |
| --- | --- |
| `animated` (default) | Rain falls, cloud and mist drift over the skyline, windows go dark and light up again, beacons pulse on the masts and spires, an aircraft crosses high up, and a small flock of bats passes now and then. |
| `still` | The same city, held at one moment, with nothing moving. |
| `plain` | No picture: a night-sky gradient behind the same colors. |

Switch between them:

- `/vigil` switches between animated and still.
- `/vigil animated`, `/vigil still` or `/vigil plain` picks one.
- `/vigil wallpaper <file.svg>` shows a wallpaper of your own, with the rain over it (see below).
- `/vigil clock Asia/Tokyo` (any time zone name, or an offset like `+05:30`) sets the clock tower to your time; `/vigil clock local` follows the computer Claude Code runs on, the default.
- `/vigil terminal` tells you how to turn on Vigil's colors in a terminal (`/theme`, then **Vigil**).
- In the desktop app, right-click an empty part of the conversation and choose **Vigil: hold the city still** (or **let the city move**).

Your choice is remembered for later sessions.

If nothing shows, run `/vigil status`. It lists the apps attached to the session and, if the theme isn't drawn, the reason the app gave.

![A mock-up of Vigil behind a sketch of the desktop app's layout](../../previews/vigil/vigil-desktop-mockup.jpg)

*A mock-up: the scene rendered behind a sketch of the app's layout, not a screenshot. [Watch ten seconds of the animated city](../../previews/vigil/vigil-motion.mp4), including a flock of bats sent up by a click.*

## Your own wallpaper

Vigil can draw a wallpaper of your own instead of the city, with its rain falling over it (on the GPU in the desktop app):

```
/vigil wallpaper ~/Pictures/wallpaper.svg
```

`/vigil wallpaper` on its own brings back the last one, and `/vigil animated` brings back the city. The file is kept with the theme's settings, so it doesn't need to stay where it was.

A backdrop takes vector drawings only, under about 127,000 characters: no photos, and no pictures embedded in an SVG. `tools/wallpaper.py` turns a picture into one. It softens the background into smooth blurred color, cuts out a subject you mark and traces it sharp with an ink outline, and can trace a bright light such as lightning crisp:

```bash
pip install vtracer opencv-python-headless numpy pillow
python tools/wallpaper.py picture.jpg wallpaper.svg --subject .4,.1,.9,1 --glow .65,0,.9,.55
```

Boxes are fractions of the picture: left, top, right, bottom. The result looks like a painted poster of the picture. If it reports the file is too large, lower `--grid`, `--detail` or `--colors`. Use pictures you have the right to use.

## In a terminal

Run `/theme` and pick **Vigil**. Claude Code's own colors turn to Vigil's: signal gold where Claude's orange was, steel blue for prompts and permissions, violet for auto-accept, green and rose for diffs, blue-black panels behind your messages, and a gold selection. Your terminal keeps its own background, so Vigil looks best with a dark one.

## Details

- **Rain that catches the light.** On desktop the rain is drawn on the GPU, faint in the dark and bright wherever the city's own light falls on it: lit windows, floodlit crowns, the clock face and beacons. Rest the pointer on an empty part of the sky and the rain around it lights up as if under a lamp.
- **Click the sky.** In the animated city, clicking an empty part of the night sky sends a flock of bats up from that point.
- **Respects Reduce Motion.** With Reduce Motion on, the city is drawn still and the shader stays off.
- **Readable first.** Panels frost over the city in the palette's own blue-black. On every surface color in the palette, body text is at least 13.8:1, secondary text 8.8:1 and muted text 5.4:1. Code takes its colors from the theme: gold keywords, green strings, violet literals, rose names and amber variables.
- **A clock that keeps time.** The clock tower carries a gilded gothic clock in a stone panel, with serif Roman numerals and a minute track, its hands set to the real time and turning on their own, moving city or still. The tower around it is dressed to match: coursed stone, quoins, gilt string courses and finials, and traceried lancets.
- **Fits any window.** The clock tower stays pinned to the right edge, and the skyline stays along the bottom, from a phone held upright to an ultrawide monitor.

The palette is dark only: blue-black stone, silver type and signal gold.

## Files

- `hooks/register.tsx`: sets the theme, the `/vigil` command, the right-click row, and drawing the backdrop.
- `hooks/look.ts`: the palette, built with the design system's `make-colors.js`.
- `hooks/scene.ts` and `hooks/art.ts`: the scene as SVG. `art.ts` is generated by `node tools/build-art.mjs hooks/art.ts`, from the buildings in `tools/city.mjs`.
- `hooks/rain.ts`: the desktop rain shader.
- `themes/vigil.json`: the terminal colors, picked with `/theme`.
- `tools/wallpaper.py`: turns a picture into a vector wallpaper.
- `tests/vigil.test.tsx`: run with `claude plugin test .`

All the art is original. It borrows a mood, not a logo or a character.
