# Theme Studio

Themes for Claude Code. Each one sets the app's colors and draws a backdrop behind the conversation, and each is its own plugin in `themes/`, installed from this repository.

| Theme | | Install |
| --- | --- | --- |
| [**Vigil**](themes/vigil) | Night over a gothic city: storm clouds, a searchlight in gold, rain and bats. Dark, animated or still. | `/plugin install vigil --marketplace Raul8900/theme-studio` |

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

Themes draw in the **Claude desktop app** and the **Claude mobile apps**. A theme installed at the user scope from a terminal also loads in the local sessions the desktop app starts. The terminal, the IDE extensions and Claude Code on the web don't draw themes.

## Adding a theme

1. Put the theme in `themes/<name>/` as a plugin of its own, with `.claude-plugin/plugin.json`, `hooks/` and a README.
2. List it in `.claude-plugin/marketplace.json` with `"source": "./themes/<name>"`.
3. Add a row to the table above, and its preview images under `previews/<name>/`.
4. Check it with `claude plugin validate .` (the marketplace and every theme) and `claude plugin test themes/<name>`.

Preview images live outside the theme folders, so installing a theme doesn't download them.
