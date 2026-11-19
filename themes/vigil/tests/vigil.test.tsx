import { expect, mock, test } from 'claude-code/testing'
import type { On, ThemeSetArgs } from 'claude-code'

const COMMAND = {
  command: 'vigil',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 100 },
} as const

const BACKDROP = {
  plugin: 'vigil',
  component: 'Backdrop',
  requestId: 'backdrop',
  props: { scene: 'vigil-animated', plugin: 'vigil', glass: { blur: 22, opacity: 0.66 } },
} as const

/** The engine beneath the mod: themes set, commands registered, a store and a clock. */
function engine(on: On, stored: Record<string, unknown> = {}, drawsThemes = true) {
  const themes: ThemeSetArgs[] = []
  on('theme.set', (_, e) => {
    themes.push(e)

    return {
      value: drawsThemes
        ? { isDrawn: true, requestId: 'theme' }
        : { isDrawn: false, reason: 'no attached client draws themes' },
    }
  })
  on('session.surfaces', () => ({ value: drawsThemes ? ['desktop'] : [] }))
  on('command.register', () => ({ value: { command: 'vigil' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  mock.store(on, stored)
  const clock = mock.clock(on, { now: 1_800_000 })

  return { themes, clock }
}

const START = { cwd: '/', surface: 'desktop', isInteractive: true } as const

/** The SVG text of the scene a drawing holds. */
async function sourceOf(ui: { find: (q: { type: string }) => Promise<{ props: Record<string, unknown> } | undefined> }) {
  const svg = await ui.find({ type: 'Svg' })

  return String(svg?.props.source ?? '')
}

test('a session opens on the moving city, in the dark palette', async ($, on) => {
  const { themes } = engine(on)
  await $.session.start(START)

  const look = themes.at(-1)
  expect(look?.backdrop).toMatchObject({ scene: 'vigil-animated', glass: { blur: 22, opacity: 0.66 } })
  expect(look?.overrideColorScheme).toBe('dark')
  expect(look?.colors?.label).toBe('Vigil')
  expect(Object.keys(look?.colors?.inputs.dark ?? {}).length).toBeGreaterThan(90)
  expect(look?.colors?.inputs.light).toBeUndefined()
})

test('/vigil switches between animated and still, and the choice outlives the session', async ($, on) => {
  const { themes } = engine(on)
  await $.session.start(START)

  const still = await $.command.run({ ...COMMAND, args: '' })
  expect(still.text).toContain('holds still')
  expect(still.isTextDisplayOnly).toBe(true)
  expect(themes.at(-1)?.backdrop).toMatchObject({ scene: 'vigil-still' })

  // A new session reads the stored choice back.
  await $.session.start(START)
  expect(themes.at(-1)?.backdrop).toMatchObject({ scene: 'vigil-still' })

  const moving = await $.command.run({ ...COMMAND, args: '' })
  expect(moving.text).toContain('the city moves')
  expect(themes.at(-1)?.backdrop).toMatchObject({ scene: 'vigil-animated' })
})

test('/vigil takes a word: plain is a gradient, an unknown word changes nothing', async ($, on) => {
  const { themes } = engine(on)
  await $.session.start(START)

  await $.command.run({ ...COMMAND, args: ' Plain ' })
  expect(themes.at(-1)?.backdrop).toMatchObject({ gradient: { angle: 180 } })
  expect(themes.at(-1)?.colors?.label).toBe('Vigil')

  await $.command.run({ ...COMMAND, args: 'static' })
  expect(themes.at(-1)?.backdrop).toMatchObject({ scene: 'vigil-still' })

  const count = themes.length
  const help = await $.command.run({ ...COMMAND, args: 'disco' })
  expect(help.text).toContain('animated, still, plain')
  expect(themes.length).toBe(count)
})

test('/vigil status says what is attached and whether the theme draws', async ($, on) => {
  engine(on)
  await $.session.start(START)
  const shown = await $.command.run({ ...COMMAND, args: 'status' })
  expect(shown.text).toContain('Vigil status: the animated backdrop.')
  expect(shown.text).toContain('Surfaces attached to this session: desktop.')
  expect(shown.text).toContain('The engine reports the theme as drawn.')
  expect(shown.isTextDisplayOnly).toBe(true)
})

test('with no app that draws themes, /vigil says so and why', async ($, on) => {
  engine(on, {}, false)
  await $.session.start(START)
  const status = await $.command.run({ ...COMMAND, args: 'status' })
  expect(status.text).toContain('Surfaces attached to this session: none.')
  expect(status.text).toContain('No desktop or mobile app is attached')
  expect(status.text).toContain('not drawn: no attached client draws themes')

  const flipped = await $.command.run({ ...COMMAND, args: '' })
  expect(flipped.text).toContain('Nothing here is drawing it (no attached client draws themes)')
})

test('a stored choice that is not a mode falls back to the moving city', async ($, on) => {
  const { themes } = engine(on, { mode: 'neon' })
  await $.session.start(START)

  expect(themes.at(-1)?.backdrop).toMatchObject({ scene: 'vigil-animated' })
})

test('the city draws on desktop and mobile, moving or still', async ($, on) => {
  engine(on)
  for (const surface of ['desktop', 'mobile'] as const) {
    const moving = await $.ui.mount({ ...BACKDROP, surface })
    const live = await sourceOf(moving)
    expect(live.startsWith('<svg')).toBe(true)
    expect(live).toContain('@keyframes sweep')
    expect(live).toContain('--t:1800.00s')
    expect((await moving.find({ type: 'Svg' }))?.props.alt).toContain('searchlight')
    await moving.unmount()

    const held = await $.ui.mount({ ...BACKDROP, surface, props: { ...BACKDROP.props, scene: 'vigil-still' } })
    const still = await sourceOf(held)
    expect(still).toContain('<path')
    expect(still).not.toContain('<style')
    expect(still).not.toContain('@keyframes')
    await held.unmount()
  }
})

test('on desktop the moving city rains through the shader; elsewhere it rains in the SVG', async ($, on) => {
  engine(on)
  const desk = await $.ui.mount({ ...BACKDROP, surface: 'desktop' })
  const shader = await desk.find({ type: 'Shader' })
  // The engine resolves the path against the plugin's folder.
  expect(shader?.props.module).toBe('hooks/rain.ts')
  const dry = await sourceOf(desk)
  expect(dry).not.toContain('class="ra"')
  expect(dry).not.toContain('clip-path="url(#beamClip)"')
  await desk.unmount()

  const phone = await $.ui.mount({ ...BACKDROP, surface: 'mobile' })
  expect(await phone.find({ type: 'Shader' })).toBeUndefined()
  const wet = await sourceOf(phone)
  expect(wet).toContain('class="ra"')
  expect(wet).toContain('clip-path="url(#beamClip)"')
  await phone.unmount()

  // The still city has no shader on any surface, and keeps its rain, held.
  const held = await $.ui.mount({ ...BACKDROP, surface: 'desktop', props: { ...BACKDROP.props, scene: 'vigil-still' } })
  expect(await held.find({ type: 'Shader' })).toBeUndefined()
  expect(await sourceOf(held)).toContain('class="ra"')
  await held.unmount()
})

test('another backdrop, or another scene, is left to whoever set it', async ($, on) => {
  engine(on)
  const theirs = await $.ui.mount({
    ...BACKDROP,
    surface: 'desktop',
    props: { ...BACKDROP.props, plugin: 'someone-else' },
  })
  expect(await theirs.find({ type: 'Svg' })).toBeUndefined()
  expect(await theirs.keepsBeneath()).toBe(true)
  await theirs.unmount()

  const other = await $.ui.mount({
    ...BACKDROP,
    surface: 'mobile',
    props: { ...BACKDROP.props, scene: 'lagoon' },
  })
  expect(await other.find({ type: 'Svg' })).toBeUndefined()
  await other.unmount()
})

/**
 * A click the mod stored `ago` ms before the clock's start. A surface raises
 * `ui.pointer` and the kit's `$` cannot, so the test hands the drawing the
 * value the pointer hook writes.
 */
function clicked(on: On, x: number, y: number, ago: number) {
  on('state.get', (_, e, next) =>
    e.key === 'burst'
      ? { value: { value: { x, y, at: 1_800_000 - ago, n: 1 }, version: 1 } }
      : next(e))
}

test('the scene keeps to what a backdrop may hold', async ($, on) => {
  engine(on)
  clicked(on, 0.5, 0.2, 500)
  const ui = await $.ui.mount({ ...BACKDROP, surface: 'desktop' })
  const source = await sourceOf(ui)
  expect(source).toContain('@keyframes v1b0')

  expect(source.length).toBeLessThan(131072)
  for (const banned of ['href', '<image', 'feImage', 'foreignObject', 'data:', 'base64', '@import', '@font-face', 'CDATA', '<!', '<?', '\\']) {
    expect(source.includes(banned)).toBe(false)
  }
  // Every url() points at a fragment of the document itself.
  expect(source.match(/url\((?!#)/g)).toBeNull()
  // Character references other than the five XML ones are refused.
  expect(source.match(/&(?!(amp|lt|gt|quot|apos);)/g)).toBeNull()
  await ui.unmount()
})

test('bats take off from a click on the sky, for a few seconds only', async ($, on) => {
  engine(on)
  clicked(on, 0.25, 0.4, 1000)
  const ui = await $.ui.mount({ ...BACKDROP, surface: 'desktop' })
  const flight = await sourceOf(ui)
  expect(flight).toContain('<svg x="25.00%" y="40.00%" width="1" height="1" overflow="visible">')
  expect(flight).toContain('@keyframes v1b8')
  // Hidden in the plain markup, so a drawing without motion shows none.
  expect(flight).toContain('<g class="v1b0" opacity="0">')
  await ui.unmount()
})

test('an old click, or one on the still city, sends up no bats', async ($, on) => {
  engine(on)
  clicked(on, 0.25, 0.4, 7000)
  const late = await $.ui.mount({ ...BACKDROP, surface: 'desktop' })
  expect(await sourceOf(late)).not.toContain('x="25.00%"')
  await late.unmount()
})

test('a still city ignores a recent click', async ($, on) => {
  engine(on)
  clicked(on, 0.25, 0.4, 500)
  const held = await $.ui.mount({ ...BACKDROP, surface: 'mobile', props: { ...BACKDROP.props, scene: 'vigil-still' } })
  expect(await sourceOf(held)).not.toContain('x="25.00%"')
  await held.unmount()
})

test('the right-click row flips the backdrop, and stays off links, selections and code', async ($, on) => {
  const { themes } = engine(on)
  await $.session.start(START)

  const menu = await $.ui.mount({ plugin: 'vigil', surface: 'desktop', component: 'ContextMenu', props: {} })
  expect((await menu.find({ type: 'Button' }))?.text).toContain('Vigil: hold the city still')
  await menu.press({ key: 'vigil-backdrop' })
  expect(themes.at(-1)?.backdrop).toMatchObject({ scene: 'vigil-still' })
  await menu.unmount()

  const again = await $.ui.mount({ plugin: 'vigil', surface: 'desktop', component: 'ContextMenu', props: {} })
  expect((await again.find({ type: 'Button' }))?.text).toContain('Vigil: let the city move')
  await again.unmount()

  for (const props of [
    { link: { href: 'https://example.com' } },
    { selection: { text: 'some words' } },
  ]) {
    const busy = await $.ui.mount({ plugin: 'vigil', surface: 'desktop', component: 'ContextMenu', props })
    expect(await busy.find({ type: 'Button' })).toBeUndefined()
    await busy.unmount()
  }
})
