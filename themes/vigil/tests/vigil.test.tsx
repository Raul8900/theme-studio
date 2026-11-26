import { expect, mock, test } from 'claude-code/testing'
import type { On, RenderSurface, ThemeSetArgs } from 'claude-code'

const COMMAND = {
  command: 'vigil',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 100 },
} as const

const BACKDROP = {
  plugin: 'vigil',
  component: 'Backdrop',
  requestId: 'backdrop',
  props: { scene: 'vigil-animated', plugin: 'vigil', glass: { blur: 4, opacity: 0.38 } },
} as const

/** The engine beneath the mod: themes set, commands registered, a store and a clock. */
function engine(on: On, stored: Record<string, unknown> = {}, surfaces: readonly RenderSurface[] = ['desktop']) {
  const themes: ThemeSetArgs[] = []
  const drawsThemes = surfaces.includes('desktop') || surfaces.includes('mobile')
  on('theme.set', (_, e) => {
    themes.push(e)

    return {
      value: drawsThemes
        ? { isDrawn: true, requestId: 'theme' }
        : { isDrawn: false, reason: 'no attached client draws themes' },
    }
  })
  on('session.surfaces', () => ({ value: surfaces }))
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
  expect(look?.backdrop).toMatchObject({ scene: 'vigil-animated', glass: { blur: 4, opacity: 0.38 } })
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
  expect(help.text).toContain('/vigil animated, /vigil still or /vigil plain picks one.')
  expect(help.text).toContain('/vigil terminal')
  expect(themes.length).toBe(count)
})

test('a word in brackets, as the hint shows it, still counts', async ($, on) => {
  const { themes } = engine(on)
  await $.session.start(START)

  await $.command.run({ ...COMMAND, args: '[still]' })
  expect(themes.at(-1)?.backdrop).toMatchObject({ scene: 'vigil-still' })

  await $.command.run({ ...COMMAND, args: ' [ Animated ] ' })
  expect(themes.at(-1)?.backdrop).toMatchObject({ scene: 'vigil-animated' })
})

test('/vigil status says what is attached and whether the theme draws', async ($, on) => {
  engine(on)
  await $.session.start(START)
  const shown = await $.command.run({ ...COMMAND, args: 'status' })
  expect(shown.text).toContain('Vigil status: the animated backdrop.')
  expect(shown.text).toContain('Attached to this session: desktop.')
  expect(shown.text).toContain('The theme is drawn.')
  expect(shown.text).not.toContain('/theme')
  expect(shown.isTextDisplayOnly).toBe(true)
})

test('in a terminal, /vigil points to /theme for the colors and the apps for the city', async ($, on) => {
  engine(on, {}, ['terminal'])
  await $.session.start(START)

  const flipped = await $.command.run({ ...COMMAND, args: '' })
  expect(flipped.text).toContain('the city holds still')
  expect(flipped.text).toContain("A terminal can't draw the city, only colors: run /theme and pick Vigil")

  const status = await $.command.run({ ...COMMAND, args: 'status' })
  expect(status.text).toContain('Attached to this session: terminal.')
  expect(status.text).toContain('The theme is not drawn: no attached client draws themes')
  expect(status.text).toContain('run /theme and pick Vigil')
})

test('with nothing attached that draws, /vigil names the apps that do', async ($, on) => {
  engine(on, {}, [])
  await $.session.start(START)
  const status = await $.command.run({ ...COMMAND, args: 'status' })
  expect(status.text).toContain('Attached to this session: nothing that draws.')
  expect(status.text).toContain('neither is attached to this session')
})

test('/vigil terminal picks the Vigil terminal theme where the setting allows it', async ($, on) => {
  engine(on, {}, ['terminal'])
  const asked: unknown[] = []
  on('config.set', (_, e) => {
    asked.push({ key: e.key, value: e.value })

    return { value: e.value }
  })
  await $.session.start(START)

  const done = await $.command.run({ ...COMMAND, args: 'terminal' })
  expect(asked).toEqual([{ key: 'theme', value: 'custom:vigil:vigil' }])
  expect(done.text).toContain("Vigil's colors are on in this terminal.")
})

test('/vigil terminal sends the person to /theme when the setting refuses', async ($, on) => {
  engine(on, {}, ['terminal'])
  on('config.set', () => ({ deny: 'For custom themes, use /theme.' }))
  await $.session.start(START)

  const told = await $.command.run({ ...COMMAND, args: 'terminal' })
  expect(told.text).toContain('run /theme and pick Vigil')
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
    expect(live).toContain('@keyframes drift')
    expect(live).toContain('--t:1800.00s')
    expect((await moving.find({ type: 'Svg' }))?.props.alt).toContain('city at night')
    await moving.unmount()

    const held = await $.ui.mount({ ...BACKDROP, surface, props: { ...BACKDROP.props, scene: 'vigil-still' } })
    const still = await sourceOf(held)
    expect(still).toContain('<path')
    // Nothing moves but the clock's hands.
    expect(still).not.toContain('@keyframes drift')
    expect(still).toContain('@keyframes hand')
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
  await desk.unmount()

  const phone = await $.ui.mount({ ...BACKDROP, surface: 'mobile' })
  expect(await phone.find({ type: 'Shader' })).toBeUndefined()
  const wet = await sourceOf(phone)
  expect(wet).toContain('class="ra"')
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

const WALL = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 56" preserveAspectRatio="xMidYMid slice" width="100%" height="100%"><path d="M0 0h100v56H0z" fill="#101317"/></svg>'

test('/vigil wallpaper reads a vector wallpaper, keeps it, and draws it with rain', async ($, on) => {
  const { themes } = engine(on)
  const reads: unknown[] = []
  on('env.get', () => ({ value: '/Users/me' }))
  on('fs.read', (_, e) => {
    reads.push(e)

    return { value: WALL }
  })
  await $.session.start(START)

  const done = await $.command.run({ ...COMMAND, args: 'wallpaper ~/walls/night.svg' })
  expect(JSON.stringify(reads)).toContain('/Users/me/walls/night.svg')
  expect(done.text).toContain('your wallpaper')
  expect(themes.at(-1)?.backdrop).toMatchObject({ scene: 'vigil-wallpaper' })

  const phone = await $.ui.mount({ ...BACKDROP, surface: 'mobile', props: { ...BACKDROP.props, scene: 'vigil-wallpaper' } })
  const wet = await sourceOf(phone)
  expect(wet).toContain('<path d="M0 0h100v56H0z" fill="#101317"/>')
  expect(wet).toContain('class="ra"')
  expect(wet).toContain('id="rainA"')
  await phone.unmount()

  const desk = await $.ui.mount({ ...BACKDROP, surface: 'desktop', props: { ...BACKDROP.props, scene: 'vigil-wallpaper' } })
  expect(await desk.find({ type: 'Shader' })).toBeDefined()
  expect(await sourceOf(desk)).not.toContain('class="ra"')
  await desk.unmount()

  // The next session comes back to it, with no file to read.
  await $.session.start(START)
  expect(themes.at(-1)?.backdrop).toMatchObject({ scene: 'vigil-wallpaper' })
})

test('a file a backdrop would refuse is not taken as a wallpaper', async ($, on) => {
  const { themes } = engine(on)
  on('fs.read', () => ({ value: '<svg xmlns="http://www.w3.org/2000/svg"><image href="photo.png"/></svg>' }))
  await $.session.start(START)
  const count = themes.length

  const told = await $.command.run({ ...COMMAND, args: 'wallpaper /tmp/photo.svg' })
  expect(told.text).toContain("can't be a wallpaper")
  expect(themes.length).toBe(count)
})

test('/vigil wallpaper with none kept says how to give it one', async ($, on) => {
  engine(on)
  await $.session.start(START)
  const told = await $.command.run({ ...COMMAND, args: 'wallpaper' })
  expect(told.text).toContain('/vigil wallpaper /path/to/wallpaper.svg')
})

test('a stored wallpaper mode with no wallpaper falls back to the moving city', async ($, on) => {
  const { themes } = engine(on, { mode: 'wallpaper' })
  await $.session.start(START)
  expect(themes.at(-1)?.backdrop).toMatchObject({ scene: 'vigil-animated' })
})

test('the clock tower shows the time where the person is', async ($, on) => {
  // The mocked clock reads 00:30:00 UTC.
  engine(on, { clockZone: 'UTC' })
  const utc = await $.ui.mount({ ...BACKDROP, surface: 'mobile' })
  const atUtc = await sourceOf(utc)
  expect(atUtc).toContain('<g class="hh" transform="rotate(15.00 269 655)">')
  expect(atUtc).toContain('<g class="mh" transform="rotate(180.00 269 655)">')
  expect(atUtc).not.toContain('class="sh"')
  expect(atUtc).toContain('--ch:1800.0s;--cm:1800.0s')
  await utc.unmount()
})

test('a fixed offset moves the hands with it', async ($, on) => {
  engine(on, { clockZone: '+05:30' })
  const ui = await $.ui.mount({ ...BACKDROP, surface: 'desktop', props: { ...BACKDROP.props, scene: 'vigil-still' } })
  const six = await sourceOf(ui)
  expect(six).toContain('<g class="hh" transform="rotate(180.00 269 655)">')
  expect(six).toContain('<g class="mh" transform="rotate(0.00 269 655)">')
  await ui.unmount()
})

test('/vigil clock sets the time zone, and refuses one that is not', async ($, on) => {
  const { themes } = engine(on)
  await $.session.start(START)

  const wrong = await $.command.run({ ...COMMAND, args: 'clock Mars/Olympus' })
  expect(wrong.text).toContain('not a time zone')

  const count = themes.length
  const tokyo = await $.command.run({ ...COMMAND, args: 'clock Asia/Tokyo' })
  expect(tokyo.text).toContain('Asia/Tokyo time, 9:30 now')
  expect(themes.length).toBe(count + 1)

  const asked = await $.command.run({ ...COMMAND, args: 'clock' })
  expect(asked.text).toContain('shows 9:30, Asia/Tokyo time')
})
