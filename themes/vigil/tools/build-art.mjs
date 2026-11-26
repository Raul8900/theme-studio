// Builds the Vigil scene: the art as plain SVG text and its animation CSS,
// written to hooks/art.ts. Deterministic: the same seed draws the same city.
//
//   node tools/build-art.mjs hooks/art.ts [preview-folder]
//
// With a preview folder it also writes scene.svg (moving) and scene-still.svg
// there, to open in a browser. The buildings come from tools/city.mjs.
import { writeFileSync } from 'node:fs'

import { buildCity, cityMarkup } from './city.mjs'

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
const n = v => String(Math.round(v * 10) / 10)

// ---------------------------------------------------------------- the city
const city = buildCity(rng(7719))
const beacon = ([x, y], i) =>
  `<g class="bk b${i % 3}"><circle cx="${n(x)}" cy="${n(y)}" r="6" fill="url(#bk)"/><circle cx="${n(x)}" cy="${n(y)}" r="1.1" fill="#ff6a5a"/></g>`
const cityBand = cityMarkup(city, beacon)

// ---------------------------------------------------------------- the clock tower
// At the right edge: viewBox 0 0 320 1000, xMaxYMax meet, so it frames the
// city on any screen. Gothic: buttresses, string courses, a lit clock face,
// a belfry with louvred lancets, corner pinnacles and a crocketed spire.
const lancet = (x, y, w, h) =>
  `M${n(x)} ${n(y + h)}V${n(y + w * 0.7)}Q${n(x)} ${n(y + w * 0.12)} ${n(x + w / 2)} ${n(y)}Q${n(x + w)} ${n(y + w * 0.12)} ${n(x + w)} ${n(y + w * 0.7)}V${n(y + h)}Z`
const R = (x0, y0, x1, y1) => `M${n(x0)} ${n(y0)}H${n(x1)}V${n(y1)}H${n(x0)}Z`

function spire(x0, x1, base, tip, bump) {
  const cx = (x0 + x1) / 2
  const steps = Math.floor((base - tip) / 12)
  const pts = [[x0, base]]
  for (let k = 1; k < steps; k++) {
    const t = k / steps
    pts.push([x0 + (cx - x0) * t - bump, base - (base - tip) * t + bump], [x0 + (cx - x0) * t, base - (base - tip) * t])
  }
  pts.push([cx, tip])
  for (let k = steps - 1; k >= 1; k--) {
    const t = k / steps
    pts.push([x1 - (x1 - cx) * t, base - (base - tip) * t], [x1 - (x1 - cx) * t + bump, base - (base - tip) * t + bump])
  }
  pts.push([x1, base])
  return `M${pts.map(([a, b]) => `${n(a)} ${n(b)}`).join('L')}Z`
}

// The tower is drawn on its own centre line, x 289, and moved in from the
// window's edge by TOWER_SHIFT so it shows whole. The clock is drawn at the
// moved position, outside that move, so its hands turn about their true centre.
const TOWER_SHIFT = -20
const TC = 289

const merlons = []
for (let x = 244; x < 334; x += 9) merlons.push(R(x, 455, x + 5, 463))

const tower = [
  R(238, 600, 340, 1120), // the shaft
  'M224 1120V880L238 862V1120Z', // a stepped buttress
  'M229 862V770L238 758V862Z',
  R(233, 600, 345, 606), R(233, 702, 345, 708), R(231, 862, 345, 868), // string courses
  R(244, 463, 334, 601), // the belfry
  R(240, 455, 338, 464), merlons.join(''), // parapet and battlements
  R(240, 418, 252, 456), 'M239 419L246 374L253 419Z', // corner pinnacles
  R(326, 418, 338, 456), 'M325 419L332 374L339 419Z',
  spire(252, 326, 456, 238, 2.2), // the spire
  R(282, 362, 296, 380), 'M280.5 363L289 350L297.5 363Z', // a lucarne on the spire
  'M288.4 240L289 216L289.6 240Z', // the finial's spike
].join('')

// Coursing: faint joints in the stone, and quoins up both corners.
const masonry = []
for (let y = 612; y < 1116; y += 11) {
  masonry.push(R(238, y, 340, y + 0.5))
}
for (let y = 470; y < 598; y += 11) masonry.push(R(244, y, 258, y + 0.5), R(320, y, 334, y + 0.5))
const quoins = []
for (let y = 610; y < 1116; y += 22) quoins.push(R(238, y, 246 + ((y / 22) % 2) * 3, y + 10.5), R(332 - ((y / 22) % 2) * 3, y, 340, y + 10.5))

// Gilt: the top edge of each string course and of the parapet, and the finials.
const gilt = [
  R(233, 600, 345, 600.9), R(233, 702, 345, 702.9), R(231, 862, 345, 862.9), R(240, 455, 338, 455.8),
  'M245.2 376L246 360L246.8 376Z', 'M331.2 376L332 360L332.8 376Z', 'M288.5 222L289 204L289.5 222Z',
].join('')
const giltDots = [[246, 374, 1.6], [332, 374, 1.6], [289, 224, 2.3]]
  .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')


// Windows: warm glass, then tracery in the stone's colour over it.
const belfry = [[260, 478, 18, 100], [300, 478, 18, 100]]
const lower = [[266, 760, 14, 54], [298, 760, 14, 54], [282, 920, 14, 46]]
const towerLit = [...belfry, ...lower].map(([x, y, w, h]) => lancet(x, y, w, h)).join('') + R(286, 366, 292, 378)
const tracery = []
for (const [x, y, w, h] of belfry) {
  tracery.push(R(x + w / 2 - 0.7, y + w * 0.5, x + w / 2 + 0.7, y + h)) // mullion
  for (let ly = y + 26; ly < y + h - 3; ly += 8) tracery.push(R(x, ly, x + w, ly + 1.3)) // louvres
}
for (const [x, y, w, h] of lower) tracery.push(R(x + w / 2 - 0.6, y + w * 0.4, x + w / 2 + 0.6, y + h), R(x, y + h * 0.55, x + w, y + h * 0.55 + 1.1))
const traceryRings = belfry.map(([x, y, w]) => `<circle cx="${x + w / 2}" cy="${n(y + w * 0.62)}" r="${n(w * 0.22)}"/>`).join('')
const archEdges = [...belfry, ...lower].map(([x, y, w, h]) => lancet(x, y, w, h)).join('')

// The clock: a gothic tower clock with a backlit face, a gilded bezel, a
// minute track, Roman numerals set in a serif face, and ornate hands. Its
// hands are placed at the real time when the scene is drawn (HOUR_AT and
// MINUTE_AT stand in for their angles) and turn on from there: CLOCK_MOTION.
const CX = TC + TOWER_SHIFT
const CY = 651
const CR = 36
const HOUR_AT = `rotate(-1001 ${CX} ${CY})`
const MINUTE_AT = `rotate(-1002 ${CX} ${CY})`

const clock = (() => {
  const marks = []
  const bold = []
  for (let i = 0; i < 60; i++) {
    const a = (Math.PI * 2 * i) / 60 - Math.PI / 2
    const [r0, r1] = i % 5 === 0 ? [CR - 6.2, CR - 2.4] : [CR - 4.6, CR - 2.4]
    ;(i % 5 === 0 ? bold : marks).push(`M${n(CX + Math.cos(a) * r0)} ${n(CY + Math.sin(a) * r0)}L${n(CX + Math.cos(a) * r1)} ${n(CY + Math.sin(a) * r1)}`)
  }
  // Upright, in a serif face, on a ring just inside the minute track.
  const names = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI']
  const ring = CR - 12.2
  const numerals = names
    .map((name, i) => {
      const a = (Math.PI * 2 * i) / 12 - Math.PI / 2
      return `<text x="${n(CX + Math.cos(a) * ring)}" y="${n(CY + Math.sin(a) * ring)}">${name}</text>`
    })
    .join('')
  // Hands, each drawn pointing at twelve from the centre.
  const hour = `M${CX - 1.8} ${CY + 6}L${CX - 1.5} ${CY - 9}L${CX - 3.6} ${CY - 13.5}L${CX} ${CY - 20}L${CX + 3.6} ${CY - 13.5}L${CX + 1.5} ${CY - 9}L${CX + 1.8} ${CY + 6}Z`
  const minute = `M${CX - 1.25} ${CY + 8}L${CX - 0.8} ${CY - CR + 8.5}L${CX} ${CY - CR + 3.6}L${CX + 0.8} ${CY - CR + 8.5}L${CX + 1.25} ${CY + 8}Z`
  return [
    `<circle cx="${CX}" cy="${CY}" r="${CR + 6}" fill="#06070b"/>`,
    `<circle cx="${CX}" cy="${CY}" r="${CR + 5.2}" fill="none" stroke="#1c2029" stroke-width="1.2"/>`,
    `<circle cx="${CX}" cy="${CY}" r="${CR + 1.3}" fill="none" stroke="url(#gilt)" stroke-width="2.2"/>`,
    `<circle cx="${CX}" cy="${CY}" r="${CR}" fill="url(#clockface)"/>`,
    `<g fill="none" stroke="#3a2610"><circle cx="${CX}" cy="${CY}" r="${CR - 2.4}" stroke-width=".8" opacity=".7"/>`,
    `<path d="${marks.join('')}" stroke-width=".75" stroke-linecap="round"/><path d="${bold.join('')}" stroke-width="1.7" stroke-linecap="round"/></g>`,
    `<g fill="#26180a" font-family="Georgia,'Times New Roman',Times,serif" font-size="6.3" font-weight="600" text-anchor="middle" dominant-baseline="central" letter-spacing="-.15">${numerals}</g>`,
    // A reflection on the glass, top left.
    `<path d="M${n(CX - CR * 0.72)} ${n(CY - CR * 0.25)}A${n(CR * 0.8)} ${n(CR * 0.8)} 0 0 1 ${n(CX + CR * 0.1)} ${n(CY - CR * 0.78)}" stroke="#fffaf0" stroke-opacity=".2" stroke-width="2.4" stroke-linecap="round" fill="none"/>`,
    `<g class="hh" transform="${HOUR_AT}"><path d="${hour}" fill="#1b1209"/></g>`,
    `<g class="mh" transform="${MINUTE_AT}"><path d="${minute}" fill="#1b1209"/><circle cx="${CX}" cy="${CY + 8}" r="2" fill="#1b1209"/></g>`,
    `<circle cx="${CX}" cy="${CY}" r="3" fill="url(#gilt)"/><circle cx="${CX}" cy="${CY}" r="1.1" fill="#1b1209"/>`,
  ].join('')
})()
// --ch and --cm are the seconds into the twelve hours and into the hour.
const CLOCK_MOTION = `.hh,.mh{transform-box:view-box;transform-origin:${CX}px ${CY}px}`
  + '.hh{animation:hand 43200s linear calc(var(--ch,0s) * -1) infinite}'
  + '.mh{animation:hand 3600s linear calc(var(--cm,0s) * -1) infinite}'
  + '@keyframes hand{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}'
  + '@media (prefers-reduced-motion:reduce){.hh,.mh{animation:none!important}}'

// ---------------------------------------------------------------- bats
// A bat, wings up, centred on 0 0, about 40 wide.
const BAT =
  'M0-2.2C1.1-2.2 1.6-1.4 1.7-.6L2.5-1.6C6-5.6 11.5-8.4 19.5-8.6C17.4-6.6 16.6-4.4 16.8-2.2C14.8-3.2 12.6-2.9 11.6-1C9.8-2.2 7.6-1.8 6.6.2C5.2-.4 3.6.1 2.3 1.7C1.6 3.6.9 4.3 0 4.6C-.9 4.3-1.6 3.6-2.3 1.7C-3.6.1-5.2-.4-6.6.2C-7.6-1.8-9.8-2.2-11.6-1C-12.6-2.9-14.8-3.2-16.8-2.2C-16.6-4.4-17.4-6.6-19.5-8.6C-11.5-8.4-6-5.6-2.5-1.6L-1.7-.6C-1.6-1.4-1.1-2.2 0-2.2ZM-1.6-2.1L-1.2-3.6L-.6-2.3ZM1.6-2.1L1.2-3.6L.6-2.3Z'

// A small flock over the tower, crossing the sky now and then.
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
    `<g transform="translate(${x} ${y}) scale(${s})"><g class="flap f${i}"><path d="${BAT}" vector-effect="non-scaling-stroke"/></g></g>`)
  .join('')

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

// ---------------------------------------------------------------- rain
const rainA = []
for (let i = 0; i < 9; i++) rainA.push(`M${n(rr(0, 60))} ${n(rr(0, 110))}v${n(rr(8, 18))}`)
const rainB = []
for (let i = 0; i < 12; i++) rainB.push(`M${n(rr(0, 90))} ${n(rr(0, 170))}v${n(rr(5, 11))}`)

// ---------------------------------------------------------------- markup
const defs = `<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#020307"/><stop offset=".36" stop-color="#060a12"/><stop offset=".6" stop-color="#0c111c"/><stop offset=".76" stop-color="#171923"/><stop offset=".88" stop-color="#261e20"/><stop offset="1" stop-color="#2e2220"/></linearGradient>
<radialGradient id="moon" cx=".1" cy=".06" r=".6"><stop offset="0" stop-color="#4a5d80" stop-opacity=".3"/><stop offset=".45" stop-color="#28344d" stop-opacity=".12"/><stop offset="1" stop-color="#101622" stop-opacity="0"/></radialGradient>
<radialGradient id="cl"><stop offset="0" stop-color="#1e2739" stop-opacity=".92"/><stop offset=".55" stop-color="#161d2b" stop-opacity=".55"/><stop offset="1" stop-color="#121826" stop-opacity="0"/></radialGradient>
<linearGradient id="hz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2618" stop-opacity="0"/><stop offset=".55" stop-color="#4a3020" stop-opacity=".3"/><stop offset="1" stop-color="#5e3c22" stop-opacity=".5"/></linearGradient>
<linearGradient id="fog1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c2434" stop-opacity=".05"/><stop offset=".7" stop-color="#262a35" stop-opacity=".34"/><stop offset="1" stop-color="#30292b" stop-opacity=".5"/></linearGradient>
<linearGradient id="fog2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a2232" stop-opacity="0"/><stop offset=".75" stop-color="#222632" stop-opacity=".22"/><stop offset="1" stop-color="#2c2528" stop-opacity=".38"/></linearGradient>
<linearGradient id="fog3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2426" stop-opacity="0"/><stop offset="1" stop-color="#3a2c26" stop-opacity=".34"/></linearGradient>
<linearGradient id="street" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9a3c" stop-opacity="0"/><stop offset="1" stop-color="#ff9a3c" stop-opacity=".2"/></linearGradient>
<linearGradient id="flood" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#e8a24a" stop-opacity=".46"/><stop offset=".55" stop-color="#d08a3c" stop-opacity=".2"/><stop offset="1" stop-color="#b87830" stop-opacity="0"/></linearGradient>
<radialGradient id="rose"><stop offset="0" stop-color="#ffd890"/><stop offset=".45" stop-color="#e09a48"/><stop offset=".75" stop-color="#b84a4a"/><stop offset="1" stop-color="#4b5fb4"/></radialGradient>
<radialGradient id="clockface" cx=".45" cy=".42" r=".62"><stop offset="0" stop-color="#fff3d2"/><stop offset=".55" stop-color="#f6d796"/><stop offset=".88" stop-color="#e2ad5e"/><stop offset="1" stop-color="#b9813a"/></radialGradient><linearGradient id="gilt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2d08a"/><stop offset=".45" stop-color="#b8862e"/><stop offset=".7" stop-color="#e6c06e"/><stop offset="1" stop-color="#7a5418"/></linearGradient>
<radialGradient id="wash" gradientUnits="userSpaceOnUse" cx="289" cy="651" r="120"><stop offset="0" stop-color="#e9a451" stop-opacity=".14"/><stop offset=".55" stop-color="#e9a451" stop-opacity=".05"/><stop offset="1" stop-color="#e9a451" stop-opacity="0"/></radialGradient>
<linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fa3c0" stop-opacity="0"/><stop offset=".5" stop-color="#8fa3c0" stop-opacity=".08"/><stop offset="1" stop-color="#8fa3c0" stop-opacity="0"/></linearGradient>
<radialGradient id="vig" cx=".5" cy=".42" r=".78"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
<radialGradient id="bk"><stop offset="0" stop-color="#ff5a4a"/><stop offset=".35" stop-color="#ff3b30" stop-opacity=".55"/><stop offset="1" stop-color="#ff3b30" stop-opacity="0"/></radialGradient>
<pattern id="rainA" width="60" height="110" patternUnits="userSpaceOnUse"><path d="${rainA.join('')}" stroke="#b9c8dc" stroke-width=".3" stroke-linecap="round"/></pattern>
<pattern id="rainB" width="90" height="170" patternUnits="userSpaceOnUse"><path d="${rainB.join('')}" stroke="#9fb0c8" stroke-width=".22" stroke-linecap="round"/></pattern>
</defs>`

// An aircraft crossing high up, its lights blinking.
const plane = `<g class="plane" transform="translate(620 150)"><circle r="1.1" fill="#f4f6ff"/><circle class="nav" cx="-3.2" cy=".6" r="1.1" fill="#ff4a3a"/><circle class="nav n2" cx="3.2" cy=".6" r="1" fill="#59f08a"/></g>`

// The scene in parts, so the mod can leave the rain out where the shader
// draws its own, and so the still scene is the same art with no motion.
const PARTS = {
  sky: `${defs}
<rect width="100%" height="100%" fill="url(#sky)"/>
<rect width="100%" height="100%" fill="url(#moon)"/>
<svg width="100%" height="74%" viewBox="0 0 1600 740" preserveAspectRatio="xMidYMin slice"><g class="cb" fill="url(#cl)">${cloudsBack}</g>${plane}</svg>
<svg width="100%" height="100%" viewBox="0 0 320 1000" preserveAspectRatio="xMaxYMax meet" overflow="visible"><g class="flock" fill="#030407" stroke="#6a7894" stroke-opacity=".4" stroke-width=".7" stroke-linejoin="round">${flockMarkup}</g></svg>
<svg y="36%" width="100%" height="64%" viewBox="0 0 2400 640" preserveAspectRatio="xMidYMax slice" overflow="visible">
<rect x="-600" y="220" width="3600" height="460" fill="url(#hz)"/>
${cityBand}
</svg>
<svg width="100%" height="100%" viewBox="0 0 320 1000" preserveAspectRatio="xMaxYMax meet" overflow="visible">
<g transform="translate(${TOWER_SHIFT} 0)">
<path d="${tower}" fill="#07090e"/>
<path d="${R(238, 600, 340, 1120)}${R(244, 463, 334, 601)}" fill="url(#wash)"/>
<path d="${masonry.join('')}" fill="#10141c"/>
<path d="${quoins.join('')}" fill="#0f131a"/>
<path d="M238 600h1.4v520h-1.4zM224 880h1.2v240h-1.2zM244 463h1.2v137h-1.2zM338.6 600h1.4v520h-1.4z" fill="#33415c" opacity=".55"/>
<path d="${gilt}" fill="url(#gilt)" opacity=".7"/>
<g fill="url(#gilt)">${giltDots}</g>
<path d="${towerLit}" fill="#e9a451" opacity=".55"/>
<path d="${tracery.join('')}" fill="#07090e"/>
<g fill="none" stroke="#07090e" stroke-width="1.1">${traceryRings}</g>
<path d="${archEdges}" fill="none" stroke="url(#gilt)" stroke-width=".7" opacity=".5"/>
</g>
${clock}
</svg>`,
  rain: `<svg width="100%" height="100%" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice"><g transform="rotate(12 200 200)"><g class="ra"><rect x="-300" y="-520" width="1000" height="1320" fill="url(#rainA)" opacity=".15"/></g><g class="rb"><rect x="-300" y="-700" width="1000" height="1500" fill="url(#rainB)" opacity=".12"/></g></g></svg>`,
  tail: `<rect width="100%" height="100%" fill="url(#vig)"/>`,
}
for (const k of Object.keys(PARTS)) PARTS[k] = PARTS[k].replace(/\n/g, '')

// Every loop's period (doubled where it runs back) divides 3600 s, so a phase
// taken from the clock never jumps. DL starts each loop at that phase.
const DL = 'calc(var(--d,0s) - var(--t,0s))'
const MOTION = `
.cb{animation:drift 120s ease-in-out ${DL} infinite alternate}
@keyframes drift{from{transform:translateX(-46px)}to{transform:translateX(46px)}}
.mist{animation:mist 90s ease-in-out ${DL} infinite alternate}
.m2{animation-duration:60s}
@keyframes mist{from{transform:translateX(-90px)}to{transform:translateX(90px)}}
.ra{--h:110px;animation:fall 1.2s linear ${DL} infinite}
.rb{--h:170px;animation:fall 2.4s linear ${DL} infinite}
@keyframes fall{from{transform:translateY(0)}to{transform:translateY(var(--h))}}
.plane{animation:plane 120s linear ${DL} infinite}
@keyframes plane{from{transform:translate(-120px,190px)}to{transform:translate(1720px,110px)}}
.nav{animation:nav 1.2s steps(1) ${DL} infinite}
.n2{--d:-.6s}
@keyframes nav{0%,70%{opacity:1}71%,100%{opacity:.15}}
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
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
`.replace(/\n/g, '')

const RAIN_DEFS = `<defs><pattern id="rainA" width="60" height="110" patternUnits="userSpaceOnUse"><path d="${rainA.join('')}" stroke="#b9c8dc" stroke-width=".3" stroke-linecap="round"/></pattern><pattern id="rainB" width="90" height="170" patternUnits="userSpaceOnUse"><path d="${rainB.join('')}" stroke="#9fb0c8" stroke-width=".22" stroke-linecap="round"/></pattern></defs>`

const banner = '// Generated by tools/build-art.mjs: the art as plain SVG text. Edit the\n// builder and run it again, not this file.\n'
const ts = banner + Object.entries({ SKY: PARTS.sky, RAIN: PARTS.rain, RAIN_DEFS, TAIL: PARTS.tail, MOTION, CLOCK_MOTION, HOUR_AT, MINUTE_AT, CLOCK_CENTER: `${CX} ${CY}`, BAT })
  .map(([k, v]) => `export const ${k} = ${JSON.stringify(v)}\n`).join('')
const [out, previews] = process.argv.slice(2)
if (!out) throw new Error('Usage: node tools/build-art.mjs hooks/art.ts [preview-folder]')
writeFileSync(out, ts)
const full = PARTS.sky + PARTS.rain + PARTS.tail
if (previews) {
  writeFileSync(`${previews}/scene.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><style>svg{--t:0s}${MOTION}</style>${full}</svg>`)
  writeFileSync(`${previews}/scene-still.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">${full}</svg>`)
}
const counts = city.layers.map(L => Object.values(L.lit).reduce((a, v) => a + v.length, 0))
console.log(`${out}: ${ts.length} characters; the whole scene ${full.length + MOTION.length}; lit windows by depth ${counts.join(', ')}`)
