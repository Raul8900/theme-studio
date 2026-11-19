import type { VigilBurst } from '../types'
import { BAT, BEAM_RAIN, HEAD, MIDDLE, MOTION, RAIN, TAIL } from './art'

export const ALT =
  'A gothic city at night in the rain: a searchlight lights the low clouds, bats cross the light, and a cloaked figure keeps watch from a gargoyle.'

/** How long a flock that took off from a click stays in the drawing, in ms. */
export const BURST_MS = 6000

export type SceneOptions = {
  /** Includes the motion: rain, the searchlight's sweep, mist, bats. */
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
  const body =
    HEAD + (hasRain ? BEAM_RAIN : '') + MIDDLE + (hasRain ? RAIN : '') + TAIL + (flight?.markup ?? '')

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
