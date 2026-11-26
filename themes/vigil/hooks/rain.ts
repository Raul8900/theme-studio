// Rain over the city, on the GPU: a few hundred streaks, faint in the dark and
// bright where the city's own light falls on them (lit windows, floodlit
// crowns, the clock face, beacons), and where the pointer rests on the bare
// sky, as if under a lamp.
import {
  buffer,
  clamp,
  dot,
  exp,
  fract,
  length,
  mix,
  picture,
  pointer,
  pointerCount,
  scene,
  shader,
  shapes,
  sin,
  size,
  smoothstep,
  step,
  time,
  vec2,
  vec3,
  vec4,
} from 'claude-code/shader'
import type { Buffer } from 'claude-code/shader'

const DROPS = 640
// The rain slants 12 degrees, falling down and to the left.
const SIN = 0.2079
const COS = 0.9781

// A small copy of the drawing under the shader, read blurred: where the light is.
const light: Buffer = buffer({ scale: 0.125, filter: 'mipmap' }, p => scene.sample(p.uv))

function hash(x: number): number {
  return fract(sin(x * 91.3458) * 47453.5453)
}

/** How lit a point is by the pointer resting on the bare backdrop: 0 to 1. */
function lampAt(at: vec2): number {
  const p = pointer(0)
  const bare = step(0.5, pointerCount) * (1 - p.over) * (1 - smoothstep(0, 0.6, p.gone))
  const d = length(at - p.at) / 150

  return bare * exp(-d * d * 3)
}

// Nothing of its own over the drawing: the rain and the lamp are drawn onto it.
const clear = picture(() => vec4(0))

// A faint warm haze under the lamp, so it reads as light and not only as rain:
// one quad around the pointer, shaded by distance from its middle.
const LAMP = 300
const haze = shapes(
  { count: 4, cover: 0.25, draw: 'strip', blend: 'add' },
  vertex => {
    const p = pointer(0)
    const bare = step(0.5, pointerCount) * (1 - p.over) * (1 - smoothstep(0, 0.6, p.gone))
    const corner = vec2(vertex < 1.5 ? -1 : 1, vertex < 0.5 || (vertex > 1.5 && vertex < 2.5) ? -1 : 1)

    return { at: ((p.at + corner * LAMP) / size) * 2 - 1, a: vec4(corner, bare, 0), hide: bare < 0.01 }
  },
  spot => {
    const r = length(spot.a.xy) * 2
    const lamp = spot.a.z * exp(-r * r * 0.75) * 0.06

    return vec4(vec3(1, 0.86, 0.62) * lamp, lamp)
  },
)

const rain = shapes(
  { count: 2, instances: DROPS, cover: 0.05, draw: 'lines', blend: 'add' },
  (vertex, instance) => {
    const depth = hash(instance * 0.37 + 9.2)
    const speed = mix(330, 640, depth)
    const len = mix(9, 32, depth)
    const span = size.y + 160
    // The head: wraps from above the window to below it, drifting left as it falls.
    const y = size.y + 80 - fract(hash(instance * 2.71 + 3.1) + (time * speed) / span) * span
    const x = hash(instance * 1.13 + 0.7) * (size.x + 260) - 20 + (y - size.y * 0.5) * (SIN / COS)
    const head = vec2(x, y)
    const at = vertex < 0.5 ? head : head + vec2(SIN, COS) * len

    const lit = light.sample(head / size, 2)
    const glow = smoothstep(0.1, 0.55, dot(lit.rgb, vec3(0.2126, 0.7152, 0.0722)))
    const lamp = lampAt(head)
    const shine = clamp((0.08 + glow * 1.1 + lamp * 0.9) * mix(0.45, 1, depth), 0, 0.9)
    const tint = mix(vec3(0.72, 0.8, 0.92), vec3(1, 0.9, 0.7), clamp(glow + lamp, 0, 1))

    // The head bright, the tail fading to nothing.
    return { at: (at / size) * 2 - 1, a: vec4(tint, vertex < 0.5 ? shine : 0) }
  },
  spot => vec4(spot.a.rgb * spot.a.a, spot.a.a),
)

export default shader({ fps: 30, passes: [light, clear, haze, rain] })
