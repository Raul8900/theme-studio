import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeResult } from 'claude-code'

import type { VigilMode } from '../types'
import { isMode, lookFor, PROBLEMS, SCENES } from './look'
import { ALT, BURST_MS, sceneSource } from './scene'

const mode = atom({ plugin: 'vigil', key: 'mode' } as const, 'animated')
const burst = atom({ plugin: 'vigil', key: 'burst' } as const, null)

const WORDS: Record<string, VigilMode> = {
  animated: 'animated',
  animate: 'animated',
  moving: 'animated',
  motion: 'animated',
  live: 'animated',
  on: 'animated',
  still: 'still',
  static: 'still',
  pause: 'still',
  paused: 'still',
  plain: 'plain',
  none: 'plain',
  off: 'plain',
  minimal: 'plain',
}

const SAID: Record<VigilMode, string> = {
  animated: 'Vigil: the city moves. Rain, drifting cloud and mist, windows going on and off, an aircraft crossing.',
  still: 'Vigil: the city holds still. The same night, with nothing moving.',
  plain: 'Vigil: no picture, just the night sky. The colors stay.',
}

/** The terminal palette this plugin ships in themes/vigil.json, as /theme stores a choice of it. */
const TERMINAL_THEME = 'custom:vigil:vigil'

const HELP = [
  '/vigil switches between the animated and the still city.',
  '/vigil animated, /vigil still or /vigil plain picks one.',
  "/vigil terminal turns on Vigil's colors in a terminal.",
  '/vigil status says what is drawing it.',
].join('\n')

/** Where the person can see the city, when nothing attached here draws it. */
function elsewhere(surfaces: readonly string[]): string {
  return surfaces.includes('terminal')
    ? "A terminal can't draw the city, only colors: run /theme and pick Vigil, or /vigil terminal. The city itself draws in the Claude desktop and mobile apps."
    : 'The city draws in the Claude desktop and mobile apps, and neither is attached to this session.'
}

/**
 * Keeps the last few things that happened to the theme in the store, for
 * `/vigil status` and for finding out why an app shows nothing.
 */
async function note($: EngineInterface, what: string, detail: Record<string, unknown> = {}): Promise<void> {
  const at = new Date(await $.clock.now()).toISOString()
  const log = await $.store.get('log')
  const kept = Array.isArray(log) ? log.slice(-24) : []
  await $.store.set('log', [...kept, { at, what, ...detail }])
}

function outcome(result: ThemeResult): Record<string, unknown> {
  return result.isDrawn ? { isDrawn: true } : { isDrawn: false, reason: result.reason }
}

/** Saves the choice for later sessions, then shows it. */
async function show($: EngineInterface, next: VigilMode): Promise<ThemeResult> {
  await $.store.set('mode', next)
  await update($, mode, () => next)
  const result = await $.theme.set(lookFor(next))
  await note($, 'set', { mode: next, ...outcome(result) })

  return result
}

/** What `/vigil` with no word, or the menu row, switches to. */
function flipped(current: VigilMode): VigilMode {
  return current === 'animated' ? 'still' : 'animated'
}

export const register: Register = on => {
  // Which surfaces have asked for the backdrop since this module loaded.
  const asked: Record<string, number> = {}

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'vigil',
      description: 'Switch the Vigil backdrop between animated and still; terminal for its colors in a terminal',
      argumentHint: '[animated|still|plain|terminal|status]',
    })
    const stored = await $.store.get('mode')
    const current: VigilMode = isMode(stored) ? stored : 'animated'
    await update($, mode, () => current)

    // Only while the palette is being tuned: the one line that would make
    // Desktop ignore the whole theme.
    const unpainted = PROBLEMS.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }
    const result = await $.theme.set(lookFor(current))
    await note($, 'start', { mode: current, surfaces: await $.session.surfaces(), ...outcome(result) })

    return next(e)
  })

  // An app opening the session, or leaving it: the theme stands for the
  // session, so one that attaches later draws it too.
  on('session.attach', async ($, e, next) => {
    await note($, 'attach', { surface: e.surface, client: e.clientId })

    return next(e)
  })

  on('session.detach', async ($, e, next) => {
    await note($, 'detach', { surface: e.surface, client: e.clientId, reason: e.reason })

    return next(e)
  })

  on('command.run', { command: 'vigil' }, async ($, e) => {
    // `[still]` reads as `still`: the hint shows the words in brackets.
    const word = e.args.toLowerCase().replace(/[[\]<>(){}"'`]/g, ' ').trim()
    const current = await read($, mode)
    const surfaces = await $.session.surfaces()

    if (word === 'terminal') {
      // /theme is where a custom theme is normally picked; where the setting
      // takes it from a plugin too, this saves the person a step.
      const answer = await $.config
        .set({ key: 'theme', value: TERMINAL_THEME })
        .catch((error: unknown) => ({ deny: String(error) }))
      await note($, 'terminal', answer.deny === undefined ? { isSet: true } : { isSet: false, reason: answer.deny })

      return {
        text: answer.deny === undefined
          ? "Vigil's colors are on in this terminal. To change back, pick another theme in /theme. The city itself draws in the Claude desktop and mobile apps."
          : "To use Vigil's colors in this terminal, run /theme and pick Vigil. The city itself draws in the Claude desktop and mobile apps.",
        isTextDisplayOnly: true,
      }
    }

    if (word === 'status') {
      const result = await $.theme.set(lookFor(current))
      await note($, 'status', { mode: current, surfaces, ...outcome(result) })
      const drawnBy = Object.entries(asked).map(([surface, n]) => `${surface} ${n}`).join(', ')

      return {
        text: [
          `Vigil status: the ${current} backdrop.`,
          `Attached to this session: ${surfaces.length === 0 ? 'nothing that draws' : surfaces.join(', ')}.`,
          result.isDrawn ? 'The theme is drawn.' : `The theme is not drawn: ${result.reason}`,
          `Backdrop drawings asked for since the mod loaded: ${drawnBy === '' ? 'none' : drawnBy}.`,
          ...(result.isDrawn ? [] : [elsewhere(surfaces)]),
        ].join('\n'),
        isTextDisplayOnly: true,
      }
    }
    const next = word === '' || word === 'toggle' ? flipped(current) : WORDS[word]

    if (next === undefined) {
      return { text: HELP, isTextDisplayOnly: true }
    }
    const set = await show($, next)

    return { text: set.isDrawn ? SAID[next] : `${SAID[next]}\n${elsewhere(surfaces)}`, isTextDisplayOnly: true }
  })

  // A row in the desktop app's right-click menu, on a click that isn't on a
  // link, a selection or code, which have menus of their own.
  on('ui.render', { component: 'ContextMenu' }, async ($, e, next) => {
    const { link, selection, code } = e.props
    if (link !== undefined || selection !== undefined || code !== undefined) {
      return next(e)
    }
    const { Box, Button, Text } = $.ui.resolve(e)
    const current = await read($, mode)
    const target = flipped(current)
    const label = current === 'plain'
      ? 'Vigil: bring the city back'
      : target === 'still'
        ? 'Vigil: hold the city still'
        : 'Vigil: let the city move'

    return (
      <Box flexDirection="column">
        <Button key="vigil-backdrop" onPress={() => show($, target)}>
          {label}
          <Text dimColor>{target === 'still' ? 'Still backdrop' : 'Animated backdrop'}</Text>
        </Button>
      </Box>
    )
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }
    const isMoving = e.props.scene === SCENES.animated
    if (e.props.plugin !== 'vigil' || (!isMoving && e.props.scene !== SCENES.still)) {
      return next(e)
    }
    asked[e.surface] = (asked[e.surface] ?? 0) + 1
    const now = await $.clock.now()
    const last = await read($, burst)
    const flight = isMoving && last !== null && now - last.at < BURST_MS ? last : null
    const phase = now / 1000

    // On desktop the moving city rains on the GPU, lit by its own light. Where
    // the shader can't play (Reduce Motion, an older app, a refusal) the
    // drawing shows alone: the same city, dry.
    if (e.surface === 'desktop' && isMoving) {
      const { Shader, Svg } = $.ui.resolve(e)

      return (
        <Shader module="./rain.ts">
          <Svg source={sceneSource({ isMoving, hasRain: false, phase, burst: flight })} alt={ALT} isInteractive />
        </Shader>
      )
    }
    const { Svg } = $.ui.resolve(e)

    return <Svg source={sceneSource({ isMoving, hasRain: true, phase, burst: flight })} alt={ALT} isInteractive />
  })

  // A click on the bare night sky sends a flock of bats up from that point.
  on('ui.pointer', async ($, e, next) => {
    if (e.scene === SCENES.animated) {
      const at = await $.clock.now()
      await update($, burst, last => ({ x: e.x, y: e.y, at, n: (last?.n ?? 0) + 1 }))
    }

    return next(e)
  })
}
