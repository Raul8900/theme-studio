// Builds the Vigil scene: the art as plain SVG text and its animation CSS,
// written to hooks/art.ts. Deterministic: the same seed draws the same city.
//
//   node tools/build-art.mjs hooks/art.ts [preview-folder]
//
// With a preview folder it also writes scene.svg (moving) and scene-still.svg
// there, to open in a browser.
import { writeFileSync } from 'node:fs'

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const r = rng(1939)
const rr = (a, b) => a + (b - a) * r()
const ri = (a, b) => Math.floor(rr(a, b + 1))
const pick = list => list[Math.floor(r() * list.length)]
const n = v => String(Math.round(v * 10) / 10)

// ---------------------------------------------------------------- skyline
// The band is 2400 x 450 user units; its base is y = 450.
const B = 450

function building(kind, x, w, h, out) {
  const top = B - h
  const d = []
  const rect = (x0, y0, x1) => d.push(`M${n(x0)} ${n(B + 40)}V${n(y0)}H${n(x1)}V${n(B + 40)}Z`)
  const bodies = [] // [x0, top, x1] for windows
  if (kind === 'block') {
    rect(x, top, x + w)
    bodies.push([x, top, x + w])
    if (r() < 0.45) { // rooftop box
      const bx = x + rr(4, w * 0.5)
      d.push(`M${n(bx)} ${n(top + 1)}V${n(top - rr(5, 11))}H${n(bx + rr(8, 16))}V${n(top + 1)}Z`)
    }
    if (r() < 0.35 && w > 40) { // water tower on legs
      const tx = x + rr(6, w - 22)
      const ty = top - 10
      d.push(`M${n(tx + 2)} ${n(top + 1)}V${n(ty)}h1.2V${n(top + 1)}Z`)
      d.push(`M${n(tx + 11)} ${n(top + 1)}V${n(ty)}h1.2V${n(top + 1)}Z`)
      d.push(`M${n(tx)} ${n(ty + 1)}V${n(ty - 12)}H${n(tx + 15)}V${n(ty + 1)}Z`)
      d.push(`M${n(tx - 1)} ${n(ty - 12)}L${n(tx + 7.5)} ${n(ty - 19)}L${n(tx + 16)} ${n(ty - 12)}Z`)
    }
    if (r() < 0.3) { // antenna
      const ax = x + rr(5, w - 5)
      const ah = rr(14, 34)
      d.push(`M${n(ax)} ${n(top + 1)}V${n(top - ah)}h1.4V${n(top + 1)}Z`)
      if (r() < 0.5) out.beacons.push([ax + 0.7, top - ah - 1])
    }
  } else if (kind === 'deco') {
    const h1 = h * 0.62
    const h2 = h * 0.82
    const h3 = h * 0.94
    const i2 = w * 0.14
    const i3 = w * 0.29
    rect(x, B - h1, x + w)
    rect(x + i2, B - h2, x + w - i2)
    rect(x + i3, B - h3, x + w - i3)
    const cx = x + w / 2
    const sp = h * rr(0.1, 0.2)
    d.push(`M${n(cx - w * 0.09)} ${n(B - h3 + 1)}L${n(cx)} ${n(B - h3 - sp)}L${n(cx + w * 0.09)} ${n(B - h3 + 1)}Z`)
    d.push(`M${n(cx - 0.7)} ${n(B - h3 - sp + 2)}V${n(B - h3 - sp - 16)}h1.4V${n(B - h3 - sp + 2)}Z`)
    out.beacons.push([cx, B - h3 - sp - 17])
    bodies.push([x, B - h1, x + w], [x + i2, B - h2, x + w - i2], [x + i3, B - h3, x + w - i3])
  } else if (kind === 'gothic') {
    rect(x, top, x + w)
    const g = w * rr(0.5, 0.8)
    d.push(`M${n(x - 1)} ${n(top + 1)}L${n(x + w / 2)} ${n(top - g)}L${n(x + w + 1)} ${n(top + 1)}Z`)
    for (const px of [x + 1, x + w - 4]) {
      d.push(`M${n(px)} ${n(top + 1)}V${n(top - 6)}L${n(px + 1.5)} ${n(top - 15)}L${n(px + 3)} ${n(top - 6)}V${n(top + 1)}Z`)
    }
    bodies.push([x, top, x + w])
  } else if (kind === 'spire') {
    rect(x, top, x + w)
    const s = h * rr(0.35, 0.55)
    d.push(`M${n(x)} ${n(top + 1)}L${n(x + w / 2)} ${n(top - s)}L${n(x + w)} ${n(top + 1)}Z`)
    d.push(`M${n(x - 3)} ${n(top + 1)}V${n(top - 4)}H${n(x + w + 3)}V${n(top + 1)}Z`)
    bodies.push([x, top, x + w])
  } else if (kind === 'dome') {
    rect(x, top, x + w)
    const ry = w * 0.36
    d.push(`M${n(x + 2)} ${n(top + 1)}A${n(w / 2 - 2)} ${n(ry)} 0 0 1 ${n(x + w - 2)} ${n(top + 1)}Z`)
    d.push(`M${n(x + w / 2 - 3)} ${n(top - ry + 2)}V${n(top - ry - 9)}H${n(x + w / 2 + 3)}V${n(top - ry + 2)}Z`)
    d.push(`M${n(x + w / 2 - 0.6)} ${n(top - ry - 8)}V${n(top - ry - 20)}h1.2V${n(top - ry - 8)}Z`)
    bodies.push([x, top, x + w])
  } else if (kind === 'slab') {
    rect(x, top, x + w)
    if (r() < 0.6) {
      const ax = x + w * rr(0.3, 0.7)
      const ah = rr(20, 50)
      d.push(`M${n(ax)} ${n(top + 1)}V${n(top - ah)}h1.4V${n(top + 1)}Z`)
      out.beacons.push([ax + 0.7, top - ah - 1])
    }
    bodies.push([x, top, x + w])
  }
  out.d.push(d.join(''))
  out.bodies.push(...bodies)
}

function layer({ from, to, minH, maxH, minW, maxW, kinds, gap = [0, 6], features = [] }) {
  const out = { d: [], bodies: [], beacons: [] }
  let x = from
  while (x < to) {
    const feature = features.find(f => x >= f.at - 40 && x <= f.at + 40 && !f.done)
    if (feature) {
      feature.done = true
      building(feature.kind, feature.at, feature.w, feature.h, out)
      x = feature.at + feature.w + rr(gap[0], gap[1])
      continue
    }
    const w = rr(minW, maxW)
    const tall = r() < 0.12
    const h = tall ? rr(maxH * 0.85, maxH * 1.08) : rr(minH, maxH * 0.8)
    building(pick(kinds), x, w, h, out)
    x += w + rr(gap[0], gap[1])
  }
  return out
}

function windows(bodies, { sx, sy, ww, wh, p, inset = 5, cool = 0.1 }) {
  const warm = []
  const cold = []
  const flick = []
  for (const [x0, top, x1] of bodies) {
    const cols = Math.floor((x1 - x0 - inset * 2) / sx)
    if (cols < 1) continue
    const ox = x0 + (x1 - x0 - (cols - 1) * sx - ww) / 2
    for (let y = top + 8; y < B - 6; y += sy) {
      const activity = r() < 0.18 ? rr(1.5, 3.2) : rr(0, 0.9)
      for (let c = 0; c < cols; c++) {
        if (r() < p * activity) {
          const cell = `M${n(ox + c * sx)} ${n(y)}h${ww}v${wh}h-${ww}z`
          if (r() < 0.012 && flick.length < 10) flick.push([ox + c * sx, y])
          else if (r() < cool) cold.push(cell)
          else warm.push(cell)
        }
      }
    }
  }
  return { warm: warm.join(''), cold: cold.join(''), flick }
}

const far = layer({
  from: -60, to: 2460, minH: 130, maxH: 360, minW: 34, maxW: 110,
  kinds: ['block', 'block', 'deco', 'slab', 'slab', 'spire'], gap: [-8, 4],
  features: [
    { at: 640, kind: 'deco', w: 92, h: 392 },
    { at: 1480, kind: 'slab', w: 58, h: 404 },
    { at: 1930, kind: 'deco', w: 104, h: 372 },
  ],
})
const farWin = windows(far.bodies, { sx: 6, sy: 9, ww: 1.8, wh: 2.6, p: 0.075, inset: 4, cool: 0.18 })

const mid = layer({
  from: -40, to: 2440, minH: 80, maxH: 270, minW: 46, maxW: 150,
  kinds: ['block', 'block', 'gothic', 'gothic', 'deco', 'dome', 'spire'], gap: [-4, 10],
  features: [
    { at: 1150, kind: 'deco', w: 110, h: 318 },
    { at: 300, kind: 'gothic', w: 96, h: 210 },
    { at: 1700, kind: 'dome', w: 120, h: 150 },
  ],
})
const midWin = windows(mid.bodies, { sx: 8, sy: 11, ww: 3, wh: 4.2, p: 0.095, inset: 6, cool: 0.08 })

const near = layer({
  from: -40, to: 2440, minH: 26, maxH: 112, minW: 70, maxW: 210,
  kinds: ['block', 'block', 'gothic', 'block'], gap: [-6, 24],
})
const nearWin = windows(near.bodies, { sx: 11, sy: 14, ww: 4, wh: 6, p: 0.05, inset: 9, cool: 0.04 })

// ---------------------------------------------------------------- hero
// The hero sits at the right edge: viewBox 0 0 320 1000, xMaxYMax meet.
const S = [292, 1090] // where the searchlight stands, hidden behind the tower
const D = [118, 172] // where its beam meets the clouds

function beam(wS, wD) {
  const dx = D[0] - S[0]
  const dy = D[1] - S[1]
  const len = Math.hypot(dx, dy)
  const px = -dy / len
  const py = dx / len
  const pt = (P, w, s) => `${n(P[0] + (px * w * s) / 2)} ${n(P[1] + (py * w * s) / 2)}`
  return `M${pt(S, wS, -1)}L${pt(S, wS, 1)}L${pt(D, wD, 1)}L${pt(D, wD, -1)}Z`
}

// Three soft layers, blurred, so the beam reads as light in rain, not as bands.
const beamLayers = [
  `<path d="${beam(34, 310)}" opacity=".32" filter="url(#soft)"/>`,
  `<path d="${beam(14, 190)}" opacity=".42" filter="url(#soft)"/>`,
  `<path d="${beam(4, 84)}" opacity=".5" filter="url(#softer)"/>`,
].join('')

// A bat, wings up, centred on 0 0, about 40 wide.
const BAT =
  'M0-2.2C1.1-2.2 1.6-1.4 1.7-.6L2.5-1.6C6-5.6 11.5-8.4 19.5-8.6C17.4-6.6 16.6-4.4 16.8-2.2C14.8-3.2 12.6-2.9 11.6-1C9.8-2.2 7.6-1.8 6.6.2C5.2-.4 3.6.1 2.3 1.7C1.6 3.6.9 4.3 0 4.6C-.9 4.3-1.6 3.6-2.3 1.7C-3.6.1-5.2-.4-6.6.2C-7.6-1.8-9.8-2.2-11.6-1C-12.6-2.9-14.8-3.2-16.8-2.2C-16.6-4.4-17.4-6.6-19.5-8.6C-11.5-8.4-6-5.6-2.5-1.6L-1.7-.6C-1.6-1.4-1.1-2.2 0-2.2ZM-1.6-2.1L-1.2-3.6L-.6-2.3ZM1.6-2.1L1.2-3.6L.6-2.3Z'

// At rest the flock is spread across the light's edges, passing through it,
// with nothing at its centre: bats crossing a searchlight, not an emblem.
const flock = [
  [44, 150, 0.72],
  [192, 150, 0.6],
  [70, 210, 0.5],
  [162, 126, 0.46],
  [6, 188, 0.42],
  [228, 198, 0.36],
]

const flockMarkup = flock
  .map(([x, y, s], i) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><g class="flap f${i}"><path d="${'#BAT'}" vector-effect="non-scaling-stroke"/></g></g>`)
  .join('')

// The watcher crouched on a ledge beside a gargoyle, in a local 200 x 170 box:
// ledge top at y 150, tower wall at x 180. Facing left, down over the city.
const FIGURE = {
  // Hood bent forward, then a cloak that falls from the shoulders to the ledge.
  body: [
    'M79 50C79 43 84 38.5 90 38.5C96 38.5 100.5 43 100.5 49C100.5 52.5 99.5 55.5 101.5 57.5C109 60 115 66 119 74C125 86 131 104 135 122L139 150H57C55 140 55.5 128 58.5 118C61 108 66 98 70.5 90C70.5 82 71.5 74 74 68C75.5 64 77.5 61 80 59C78.5 56.5 78.5 53 79 50Z',
    // A gloved hand resting on the ledge's edge in front.
    'M66 132C60 134.5 55 139 52 145L51.5 150H60L61.5 146C63 142 65.5 139 69 137Z',
  ],
  // The back of the cloak, lifting in the wind and breaking into points.
  cape: 'M108 72C122 80 136 92 148 106C156 115 164 122 174 126L165 128.5L170 136L159 133L161 142.5L151 137L150 147L141 139L139 150H131L128 120C123 104 116 88 108 72Z',
  fold: '',
  // A grotesque crouched on the ledge beside him, horns up, jaw open.
  gargoyle: 'M50 150L49 136C48.5 128 45.5 121.5 40.5 117L43 104L37 111.5L34.5 101L31.5 112.5C26.5 112.5 21.5 115 18 119.5L7 120.5L14 125L6 128L16 130C17.5 135 20.5 139.5 25 142L22 150ZM40.5 118L53 102.5L51 113L60 106.5L53.5 125Z',
  cornice: 'M0 150H200V157H0ZM8 157H200V163H8Z',
}

// The tower at the right edge; the watcher and the gargoyle sit on its ledge.
const tower = [
  'M236 1120V548L238 540V530L240 500L242 530V540L246 548H252L288 418L324 548H340V1120Z', // body, roof, left pinnacle
  'M285 420L288 386L291 420Z', // finial
  'M230 742V734H240V742Z', // lower cornice
]
// Local (180, 150), where the ledge meets the wall, lands on the tower at (240, 614).
const FIG_S = 0.9
const FIG_T = [240 - 180 * FIG_S, 614 - 150 * FIG_S]
const figureAt = (fill, dx, dy, cls = '') => `<g transform="translate(${n(FIG_T[0] + dx)} ${n(FIG_T[1] + dy)}) scale(${FIG_S})" fill="${fill}"><path d="${FIGURE.body.join('')}"/><g class="cape${cls}"><path d="${FIGURE.cape}"/></g></g>`
const towerWindows = 'M262 640V612Q266 602 270 612V640ZM300 690V660Q304 650 308 660V690ZM268 820V792Q272 782 276 792V820Z'

// ---------------------------------------------------------------- clouds
function cloudBank(cx, cy, spread, count, rx, ry) {
  const out = []
  for (let i = 0; i < count; i++) {
    const x = cx + rr(-spread, spread)
    const y = cy + rr(-ry * 0.6, ry * 0.6)
    out.push(`<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx * rr(0.55, 1.15))}" ry="${n(ry * rr(0.6, 1.2))}"/>`)
  }
  return out.join('')
}
const cloudsBack = [
  cloudBank(160, 120, 260, 6, 230, 70),
  cloudBank(760, 90, 320, 7, 260, 66),
  cloudBank(1380, 150, 300, 7, 250, 74),
  cloudBank(420, 300, 340, 6, 260, 60),
  cloudBank(1100, 330, 360, 7, 270, 62),
  cloudBank(1700, 290, 200, 4, 220, 58),
].join('')
const cloudsFront = [
  cloudBank(260, 210, 260, 5, 200, 30),
  cloudBank(980, 240, 300, 5, 240, 28),
  cloudBank(1520, 430, 260, 4, 220, 26),
  cloudBank(620, 470, 300, 4, 230, 24),
].join('')

// ---------------------------------------------------------------- rain
const rainA = []
for (let i = 0; i < 9; i++) rainA.push(`M${n(rr(0, 60))} ${n(rr(0, 110))}v${n(rr(8, 18))}`)
const rainG = []
for (let i = 0; i < 22; i++) {
  const x = rr(0, 80)
  const y = rr(0, 150)
  rainG.push(`M${n(x)} ${n(y)}v${n(rr(6, 16))}`)
}
const rainB = []
for (let i = 0; i < 12; i++) rainB.push(`M${n(rr(0, 90))} ${n(rr(0, 170))}v${n(rr(5, 11))}`)

// ---------------------------------------------------------------- markup
const defs = `<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#020307"/><stop offset=".38" stop-color="#060a12"/><stop offset=".62" stop-color="#0c111c"/><stop offset=".78" stop-color="#161822"/><stop offset=".9" stop-color="#221c1e"/><stop offset="1" stop-color="#2a2020"/></linearGradient>
<radialGradient id="moon" cx=".1" cy=".06" r=".6"><stop offset="0" stop-color="#4a5d80" stop-opacity=".34"/><stop offset=".45" stop-color="#28344d" stop-opacity=".14"/><stop offset="1" stop-color="#101622" stop-opacity="0"/></radialGradient>
<radialGradient id="cl"><stop offset="0" stop-color="#1e2739" stop-opacity=".92"/><stop offset=".55" stop-color="#161d2b" stop-opacity=".55"/><stop offset="1" stop-color="#121826" stop-opacity="0"/></radialGradient>
<radialGradient id="clf"><stop offset="0" stop-color="#0a0e16" stop-opacity=".9"/><stop offset=".6" stop-color="#0a0e16" stop-opacity=".45"/><stop offset="1" stop-color="#0a0e16" stop-opacity="0"/></radialGradient>
<radialGradient id="halo"><stop offset="0" stop-color="#f2b632" stop-opacity=".34"/><stop offset=".4" stop-color="#d9962a" stop-opacity=".12"/><stop offset="1" stop-color="#b8781f" stop-opacity="0"/></radialGradient>
<radialGradient id="glow"><stop offset="0" stop-color="#ffe7a6" stop-opacity=".6"/><stop offset=".5" stop-color="#f6c457" stop-opacity=".22"/><stop offset="1" stop-color="#f2b632" stop-opacity="0"/></radialGradient>
<filter id="soft" x="-30%" y="-10%" width="160%" height="120%"><feGaussianBlur stdDeviation="5"/></filter><filter id="softer" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.6"/></filter>
<radialGradient id="disk"><stop offset="0" stop-color="#fffbef"/><stop offset=".5" stop-color="#fff0c6"/><stop offset=".78" stop-color="#ffd877"/><stop offset=".9" stop-color="#f6bd45" stop-opacity=".8"/><stop offset=".97" stop-color="#e9a22a" stop-opacity=".25"/><stop offset="1" stop-color="#e9a22a" stop-opacity="0"/></radialGradient>
<linearGradient id="beam" gradientUnits="userSpaceOnUse" x1="${S[0]}" y1="${S[1]}" x2="${D[0]}" y2="${D[1]}"><stop offset="0" stop-color="#ffe2a0" stop-opacity=".5"/><stop offset=".45" stop-color="#ffe6ae" stop-opacity=".26"/><stop offset="1" stop-color="#fff0cc" stop-opacity=".12"/></linearGradient>
<linearGradient id="hz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2618" stop-opacity="0"/><stop offset=".55" stop-color="#4a3020" stop-opacity=".28"/><stop offset="1" stop-color="#5a3a22" stop-opacity=".45"/></linearGradient>
<linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fa3c0" stop-opacity="0"/><stop offset=".5" stop-color="#8fa3c0" stop-opacity=".09"/><stop offset="1" stop-color="#8fa3c0" stop-opacity="0"/></linearGradient>
<radialGradient id="vig" cx=".5" cy=".42" r=".78"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
<radialGradient id="bk"><stop offset="0" stop-color="#ff5a4a"/><stop offset=".35" stop-color="#ff3b30" stop-opacity=".55"/><stop offset="1" stop-color="#ff3b30" stop-opacity="0"/></radialGradient>
<clipPath id="beamClip"><path d="${beam(18, 248)}"/></clipPath>
<pattern id="rainG" width="80" height="160" patternUnits="userSpaceOnUse" patternTransform="rotate(12)"><path d="${rainG.join('')}" stroke="#ffe9bd" stroke-width=".5" stroke-opacity=".8" stroke-linecap="round"/></pattern>
<pattern id="rainA" width="60" height="110" patternUnits="userSpaceOnUse"><path d="${rainA.join('')}" stroke="#b9c8dc" stroke-width=".3" stroke-linecap="round"/></pattern>
<pattern id="rainB" width="90" height="170" patternUnits="userSpaceOnUse"><path d="${rainB.join('')}" stroke="#9fb0c8" stroke-width=".22" stroke-linecap="round"/></pattern>
</defs>`

const beacon = ([x, y], i) =>
  `<g class="bk b${i % 3}"><circle cx="${n(x)}" cy="${n(y)}" r="7" fill="url(#bk)"/><circle cx="${n(x)}" cy="${n(y)}" r="1.3" fill="#ff6a5a"/></g>`

const flickers = [...far.bodies.length ? [] : [], ...midWin.flick]
  .map(([x, y], i) => `<path class="fk k${i % 4}" d="M${n(x)} ${n(y)}h3v4.2h-3z"/>`)
  .join('')

// The scene in parts, so the mod can leave the rain out where the shader
// draws its own, and so the still scene is the same art with no motion.
const PARTS = {
  head: `${defs}
<rect width="100%" height="100%" fill="url(#sky)"/>
<rect width="100%" height="100%" fill="url(#moon)"/>
<svg width="100%" height="74%" viewBox="0 0 1600 740" preserveAspectRatio="xMidYMin slice"><g class="cb" fill="url(#cl)">${cloudsBack}</g></svg>
<svg width="100%" height="100%" viewBox="0 0 320 1000" preserveAspectRatio="xMaxYMax meet" overflow="visible">
<g class="sweep">
<ellipse cx="${D[0]}" cy="${D[1]}" rx="270" ry="160" fill="url(#halo)"/>
<g fill="url(#beam)">${beamLayers}</g>`,
  beamRain: `<g clip-path="url(#beamClip)"><g class="rg"><rect x="-200" y="-200" width="700" height="1400" fill="url(#rainG)"/></g></g>`,
  middle: `<g class="breathe" transform="rotate(-9 ${D[0]} ${D[1]})"><ellipse cx="${D[0]}" cy="${D[1]}" rx="175" ry="88" fill="url(#glow)"/><ellipse cx="${D[0]}" cy="${D[1]}" rx="94" ry="39" fill="url(#disk)" filter="url(#softer)"/><g filter="url(#softer)"><ellipse cx="${D[0] - 18}" cy="${D[1] - 9}" rx="52" ry="4" fill="#fffaf0" opacity=".45"/><ellipse cx="${D[0] + 20}" cy="${D[1] + 8}" rx="58" ry="5" fill="#e9a43a" opacity=".28"/><ellipse cx="${D[0] - 34}" cy="${D[1] + 14}" rx="34" ry="3" fill="#e9a43a" opacity=".22"/></g></g>
</g>
<g class="wisp" filter="url(#soft)"><ellipse cx="40" cy="214" rx="170" ry="9" fill="#ffd98a" opacity=".1"/><ellipse cx="200" cy="128" rx="130" ry="7" fill="#ffd98a" opacity=".08"/></g>
<g class="flock" fill="#030407" stroke="#6a7894" stroke-opacity=".4" stroke-width=".7" stroke-linejoin="round">${flockMarkup}</g>
</svg>
<svg y="55%" width="100%" height="45%" viewBox="0 0 2400 450" preserveAspectRatio="xMidYMax slice" overflow="visible">
<rect x="-600" y="120" width="3600" height="400" fill="url(#hz)"/>
<path d="${far.d.join('')}" fill="#0f141d"/>
<path d="${farWin.warm}" fill="#e9b45f" opacity=".32"/><path d="${farWin.cold}" fill="#a9c4e6" opacity=".22"/>
${far.beacons.slice(0, 3).map(beacon).join('')}
<g class="mist"><rect x="-600" y="250" width="3600" height="150" fill="url(#mist)"/></g>
<path d="${mid.d.join('')}" fill="#080b12"/>
<path d="${midWin.warm}" fill="#f2b45a" opacity=".74"/><path d="${midWin.cold}" fill="#bcd4f2" opacity=".5"/>
<g fill="#f2b45a" opacity=".74">${flickers}</g>
${mid.beacons.slice(0, 4).map((b, i) => beacon(b, i + 1)).join('')}
<g class="mist m2"><rect x="-600" y="360" width="3600" height="110" fill="url(#mist)"/></g>
<path d="${near.d.join('')}" fill="#040509"/>
<path d="${nearWin.warm}" fill="#f0a848" opacity=".55"/>
</svg>
<svg width="100%" height="100%" viewBox="0 0 320 1000" preserveAspectRatio="xMaxYMax meet" overflow="visible">
<path d="${tower.join('')}" fill="#030406"/>
<path d="${towerWindows}" fill="#f0a848" opacity=".5"/>
<g transform="translate(${n(FIG_T[0])} ${n(FIG_T[1])}) scale(${FIG_S})" fill="#020305"><path d="${FIGURE.gargoyle}"/><path d="${FIGURE.cornice}"/></g>
${figureAt('#ffcf63', -1.2, -0.5)}${figureAt('#010203', 0, 0)}
</svg>`,
  rain: `<svg width="100%" height="100%" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice"><g transform="rotate(12 200 200)"><g class="ra"><rect x="-300" y="-520" width="1000" height="1320" fill="url(#rainA)" opacity=".15"/></g><g class="rb"><rect x="-300" y="-700" width="1000" height="1500" fill="url(#rainB)" opacity=".12"/></g></g></svg>`,
  tail: `<rect width="100%" height="100%" fill="url(#vig)"/>`,
}
for (const k of Object.keys(PARTS)) PARTS[k] = PARTS[k].replaceAll('#BAT', BAT).replace(/\n/g, '')

// Every loop's period (doubled where it runs back) divides 3600 s, so a phase
// taken from the clock never jumps. DL starts each loop at that phase.
const DL = 'calc(var(--d,0s) - var(--t,0s))'
const MOTION = `
.sweep{transform-box:view-box;transform-origin:${S[0]}px ${S[1]}px;animation:sweep 30s ease-in-out ${DL} infinite alternate}
@keyframes sweep{from{transform:rotate(-3.2deg)}to{transform:rotate(3.2deg)}}
.breathe{animation:breathe 6s ease-in-out ${DL} infinite alternate}
@keyframes breathe{from{opacity:.86}to{opacity:1}}
.cb{animation:drift 120s ease-in-out ${DL} infinite alternate}
@keyframes drift{from{transform:translateX(-46px)}to{transform:translateX(46px)}}
.wisp{animation:wisp 45s ease-in-out ${DL} infinite alternate}
@keyframes wisp{from{transform:translateX(-14px)}to{transform:translateX(16px)}}
.mist{animation:mist 90s ease-in-out ${DL} infinite alternate}
.m2{animation-duration:60s}
@keyframes mist{from{transform:translateX(-90px)}to{transform:translateX(90px)}}
.ra{--h:110px;animation:fall 1.2s linear ${DL} infinite}
.rb{--h:170px;animation:fall 2.4s linear ${DL} infinite}
@keyframes fall{from{transform:translateY(0)}to{transform:translateY(var(--h))}}
.rg{animation:fallg 1.2s linear ${DL} infinite}
@keyframes fallg{from{transform:translate(0,0)}to{transform:translate(-33.27px,156.5px)}}
.flock{animation:fly 45s linear ${DL} infinite}
@keyframes fly{0%{transform:translate(560px,70px) scale(1.1);opacity:0}2%{opacity:1}30%{opacity:1}36%,100%{transform:translate(-1900px,-160px) scale(.55);opacity:0}}
.flap{transform-box:fill-box;transform-origin:center;animation:flap .3s ease-in-out ${DL} infinite alternate}
.f1{--d:-.1s}.f2{--d:-.2s}.f3{--d:-.05s}.f4{--d:-.25s}.f5{--d:-.15s}
@keyframes flap{from{transform:scaleY(1)}to{transform:scaleY(-.62)}}
.bk{animation:pulse 3.6s ease-in-out ${DL} infinite}
.b1{--d:-1.2s}.b2{--d:-2.4s}
@keyframes pulse{0%,100%{opacity:.25}50%{opacity:1}}
.fk{animation:fk 40s steps(1) ${DL} infinite}
.k1{animation-duration:45s}.k2{animation-duration:36s;--d:-11s}.k3{animation-duration:60s;--d:-23s}
@keyframes fk{0%,58%{opacity:1}59%,73%{opacity:0}74%,100%{opacity:1}}
.cape{transform-box:fill-box;transform-origin:0 0;animation:cape 5s ease-in-out ${DL} infinite alternate}
@keyframes cape{from{transform:rotate(-2deg)}to{transform:rotate(2.5deg)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
`.replace(/\n/g, '')

const banner = '// Generated by tools/build-art.mjs: the art as plain SVG text. Edit the\n// builder and run it again, not this file.\n'
const ts = banner + Object.entries({ HEAD: PARTS.head, BEAM_RAIN: PARTS.beamRain, MIDDLE: PARTS.middle, RAIN: PARTS.rain, TAIL: PARTS.tail, MOTION, BAT })
  .map(([k, v]) => `export const ${k} = ${JSON.stringify(v)}\n`).join('')
const [out, previews] = process.argv.slice(2)
if (!out) throw new Error('Usage: node tools/build-art.mjs hooks/art.ts [preview-folder]')
writeFileSync(out, ts)
const full = PARTS.head + PARTS.beamRain + PARTS.middle + PARTS.rain + PARTS.tail
if (previews) {
  writeFileSync(`${previews}/scene.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><style>svg{--t:0s}${MOTION}</style>${full}</svg>`)
  writeFileSync(`${previews}/scene-still.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">${full}</svg>`)
}
console.log(`${out}: ${ts.length} characters; the whole scene ${full.length + MOTION.length}`)
