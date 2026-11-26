import type { VigilBurst } from '../types'
import { BAT, MOTION, RAIN, RAIN_DEFS, SKY, TAIL } from './art'

export const ALT =
  'A gothic city at night in the rain: art deco towers with floodlit crowns, a cathedral, a domed hall and a clock tower under low cloud, windows lit here and there.'

export const WALLPAPER_ALT = 'Your own wallpaper, with rain falling over it.'

/** The most a backdrop drawing may hold, in characters. */
export const SVG_LIMIT = 131072

/** How long a flock that took off from a click stays in the drawing, in ms. */
export const BURST_MS = 6000

export type SceneOptions = {
  /** Includes the motion: rain, mist, clouds, an aircraft, bats, beacons. */
  isMoving: boolean
  /** Draws the SVG's own rain; false where a shader rains over it instead. */
  hasRain: boolean
  /**
   * Seconds into the loops, read off the clock. Each loop's period divides
   * 3600 s, so a redraw starts every loop where the last drawing left it.
   */
  phase: number
  /** A click on the sky moments ago: bats take off from that point. */
  burst?: VigilBurst | null
}

/** The whole scene as one SVG document, sized to fill whatever box holds it. */
export function sceneSource({ isMoving, hasRain, phase, burst }: SceneOptions): string {
  const flight = isMoving && burst ? takeOff(burst) : null
  const style = isMoving
    ? `<style>svg{--t:${(((phase % 3600) + 3600) % 3600).toFixed(2)}s}${MOTION}${flight?.css ?? ''}</style>`
    : ''
  const body = SKY + (hasRain ? RAIN : '') + TAIL + (flight?.markup ?? '')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">${style}${body}</svg>`
}

/**
 * Nine bats bursting out of the dark where the person clicked, flying at the
 * viewer and away. Hidden in the plain markup, so a drawing with its motion
 * taken out shows none of them.
 */
function takeOff(burst: VigilBurst): { css: string; markup: string } {
  let seed = (burst.n * 7919 + 104729) % 2147483647
  const rand = () => {
    seed = (seed * 48271) % 2147483647
    return seed / 2147483647
  }
  const id = `v${burst.n % 1000}`
  const css: string[] = []
  const bats: string[] = []
  for (let i = 0; i < 9; i++) {
    const angle = ((-90 + (rand() * 2 - 1) * 78) * Math.PI) / 180
    const reach = 260 + rand() * 420
    const dx = Math.cos(angle) * reach
    const dy = Math.sin(angle) * reach
    const sway = (rand() * 2 - 1) * 60
    const size = 1.2 + rand() * 1.1
    const seconds = 2.6 + rand() * 1.3
    const name = `${id}b${i}`
    const at = (x: number, y: number, s: number) =>
      `transform:translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${s.toFixed(2)})`
    css.push(
      `.${name}{animation:${name} ${seconds.toFixed(2)}s cubic-bezier(.2,.65,.3,1) ${(i * 0.06).toFixed(2)}s both}`,
      `@keyframes ${name}{0%{${at(0, 0, 0.15)};opacity:0}12%{opacity:1}50%{${at(dx * 0.45 + sway, dy * 0.5, size * 0.6)}}80%{opacity:1}100%{${at(dx, dy, size)};opacity:0}}`,
    )
    bats.push(`<g class="${name}" opacity="0"><g class="flap f${i % 6}"><path d="${BAT}"/></g></g>`)
  }
  const x = (Math.min(1, Math.max(0, burst.x)) * 100).toFixed(2)
  const y = (Math.min(1, Math.max(0, burst.y)) * 100).toFixed(2)

  return {
    css: css.join(''),
    // A thin cold rim, as if from the moon, keeps them apart from the dark.
    markup: `<svg x="${x}%" y="${y}%" width="1" height="1" overflow="visible"><g fill="#030407" stroke="#6a7894" stroke-opacity=".55" stroke-width=".8" stroke-linejoin="round">${bats.join('')}</g></svg>`,
  }
}

/**
 * A wallpaper of the person's own, drawn whole, with Vigil's rain over it.
 * The wallpaper is nested as it is: its own viewBox and preserveAspectRatio
 * decide how it fills the window.
 */
export function wallpaperSource(svg: string, { hasRain, phase }: { hasRain: boolean; phase: number }): string {
  const t = (((phase % 3600) + 3600) % 3600).toFixed(2)
  const rain = hasRain ? `<style>svg{--t:${t}s}${MOTION}</style>${RAIN_DEFS}` : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">${rain}${svg.trim()}${hasRain ? RAIN : ''}</svg>`
}

/**
 * Why a file can't be a wallpaper, or null when it can: a whole SVG document,
 * pure vector (what a backdrop takes), and small enough to draw with the rain.
 */
export function wallpaperProblem(svg: string): string | null {
  const text = svg.trim()
  if (!/^<svg[\s>]/.test(text) || !text.endsWith('</svg>')) {
    return 'it is not an SVG drawing (it should start with <svg and end with </svg>)'
  }
  const room = SVG_LIMIT - wallpaperSource('', { hasRain: true, phase: 0 }).length
  if (text.length > room) {
    return `it is ${text.length.toLocaleString('en')} characters, and a wallpaper can be ${room.toLocaleString('en')} at most`
  }
  const banned = /href|<image|feImage|foreignObject|data:|base64|@import|@font-face|CDATA|<!|<\?|\\|<script|\son[a-z]+\s*=/i.exec(text)
  if (banned) {
    return `it holds ${banned[0].trim()}, and a backdrop takes vector shapes only (no pictures, links or scripts)`
  }
  if (/url\((?!#)/.test(text)) {
    return 'it points outside itself with url(), and a backdrop may only point inside itself'
  }
  if (/&(?!(amp|lt|gt|quot|apos);)/.test(text)) {
    return 'it holds a character reference a backdrop refuses'
  }

  return null
}
