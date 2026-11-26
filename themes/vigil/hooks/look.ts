import type { ThemeBackdropGlass, ThemeSetArgs } from 'claude-code'

import type { VigilMode } from '../types'
import { makeColors } from './make-colors.js'

// Night over a gothic city: blue-black stone, silver type, and the gold of
// lit windows and floodlit crowns. Dark only, since the idea is the night.
export const { theme: COLORS, problems: PROBLEMS } = makeColors({
  label: 'Vigil',
  id: 'vigil',
  only: 'dark',
  roles: {
    // Signal gold for keywords, links and the main button, warm enough at its
    // deeper shade not to turn olive, with black type on it.
    accent: { seed: '#f4ad2a', fillShade: 400 },
    danger: '#e5484d',
    success: '#3fb68b',
    warning: '#ff8a3d',
    pro: '#8b7cf6',
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#07090d',
        'surface-1': '#0d1016',
        'surface-2': '#12161e',
        'surface-3': '#181d27',
        'text-primary': '#e6e9ef',
        'text-secondary': '#b4bccb',
        'text-muted': '#8a93a6',
      },
    },
    git: {
      added: '#4cc69a',
      removed: '#f06a6e',
      modified: '#7cb3f0',
      merged: '#a597fa',
      closed: '#f06a6e',
      conflicting: '#ff9a55',
      draft: '#a3abbd',
    },
  },
})

export const SCENES = { animated: 'vigil-animated', still: 'vigil-still', wallpaper: 'vigil-wallpaper' } as const

// A light frost over the city in the palette's own panel color: enough to keep text crisp, little enough to see the city.
const GLASS: ThemeBackdropGlass = { blur: 4, opacity: 0.38 }

/** The whole theme for one backdrop mode: the palette is the same in all three. */
export function lookFor(mode: VigilMode): ThemeSetArgs {
  if (mode === 'plain') {
    return {
      colors: COLORS,
      overrideColorScheme: 'dark',
      backdrop: {
        gradient: {
          stops: [
            { at: 0, color: '#020307' },
            { at: 0.55, color: '#0a0e17' },
            { at: 0.85, color: '#141521' },
            { at: 1, color: '#211a1c' },
          ],
          angle: 180,
        },
      },
    }
  }

  return {
    colors: COLORS,
    overrideColorScheme: 'dark',
    backdrop: { scene: SCENES[mode], glass: GLASS },
  }
}

export const MODES: readonly VigilMode[] = ['animated', 'still', 'plain', 'wallpaper']

export function isMode(value: unknown): value is VigilMode {
  return value === 'animated' || value === 'still' || value === 'plain' || value === 'wallpaper'
}
