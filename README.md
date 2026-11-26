# Theme Studio

Themes for Claude Code. Each one sets the app's colors and draws a backdrop behind the conversation, and each is its own plugin in `themes/`, installed from this repository.

| Theme | | Install |
| --- | --- | --- |
| [**Vigil**](themes/vigil) | Night over a gothic and art deco city: low cloud, rain, floodlit towers and a clock tower. Dark, animated or still, or your own wallpaper with its rain; colors for the terminal too. | `/plugin install vigil --marketplace Raul8900/theme-studio` |

![Vigil](previews/vigil/vigil-scene.jpg)

## Installing a theme

At the prompt of a Claude Code session in a terminal:

```
/plugin install vigil --marketplace Raul8900/theme-studio
```

Answer `y` to add the marketplace, then press Enter for the user scope. From a shell:

```
claude plugin install vigil --marketplace Raul8900/theme-studio
```

In the desktop app, where `/plugin` doesn't run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `Raul8900/theme-studio`, then **Add plugin**.

Swap `vigil` for the name of another theme in the table to install that one.

## Where themes show

- **Desktop and mobile apps:** the whole theme, its colors and its backdrop. A theme installed at the user scope from a terminal also loads in the local sessions the desktop app starts.
- **Terminal:** a terminal can't draw a backdrop, but a theme can bring its colors. Run `/theme` and pick it by name. Each theme's README says whether it has terminal colors.
- **Claude Code on the web:** neither, for now.

To update a theme you've installed, run `claude plugin update <theme>@theme-studio` (for example `vigil@theme-studio`) and restart Claude Code.

## Adding a theme

1. Put the theme in `themes/<name>/` as a plugin of its own, with `.claude-plugin/plugin.json`, `hooks/` and a README. Terminal colors go in its own `themes/<name>.json` (`name`, a `base` such as `dark`, and `overrides`), which `/theme` lists.
2. List it in `.claude-plugin/marketplace.json` with `"source": "./themes/<name>"`.
3. Add a row to the table above, and its preview images under `previews/<name>/`.
4. Check it with `claude plugin validate .` (the marketplace and every theme) and `claude plugin test themes/<name>`.

Preview images live outside the theme folders, so installing a theme doesn't download them.
