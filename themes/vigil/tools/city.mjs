// The city: four depths of buildings drawn as architecture, not boxes, for
// the band along the bottom of the scene (viewBox 0 0 2400 640, base y 640).
//
// Each building type is a small builder: art deco towers with setbacks and
// crowns, gothic towers with pinnacles and crocketed spires, glass slabs,
// stepped towers, mansard blocks with dormers, walk-ups with cornices, water
// towers and fire escapes, a cathedral, a domed civic hall, sawtooth
// warehouses and lattice masts. Windows are lit the way a city is at night:
// offices by the floor, homes here and there, a few televisions.

export const BASE = 640

export function buildCity(r) {
  const rr = (a, b) => a + (b - a) * r()
  const pick = list => list[Math.floor(r() * list.length)]
  const n = v => String(Math.round(v * 10) / 10)
  const B = BASE
  const FOOT = B + 30
  const R = (x0, y0, x1, y1) => `M${n(x0)} ${n(y0)}H${n(x1)}V${n(y1)}H${n(x0)}Z`
  const poly = pts => `M${pts.map(([a, b]) => `${n(a)} ${n(b)}`).join('L')}Z`
  const tri = (a, b, c, d, e, f) => poly([[a, b], [c, d], [e, f]])
  // A pointed (gothic) arch: x, top y, width, height.
  const lancet = (x, y, w, h) =>
    `M${n(x)} ${n(y + h)}V${n(y + w * 0.7)}Q${n(x)} ${n(y + w * 0.12)} ${n(x + w / 2)} ${n(y)}Q${n(x + w)} ${n(y + w * 0.12)} ${n(x + w)} ${n(y + w * 0.7)}V${n(y + h)}Z`

  function layerOf(spec) {
    return {
      spec,
      sil: [], detail: [], rim: [], lines: [], over: [], overLines: [], ribs: [], panes: [], halo: [],
      lit: { warm: [], pale: [], cool: [], tv: [], amber: [] },
      cells: { warm: [], pale: [], cool: [], tv: [] },
      crowns: [], extras: [], beacons: [], flick: [],
    }
  }

  // ---------------------------------------------------------- windows
  function windows(L, x0, y0, x1, y1, character) {
    const { sx, sy, ww, wh, rate } = L.spec.win
    const span = x1 - x0
    const cols = Math.floor((span - sx * 0.4) / sx)
    const rows = Math.floor((y1 - y0 - sy * 0.3) / sy)
    if (cols < 1 || rows < 1) return
    const ox = x0 + (span - (cols - 1) * sx - ww) / 2
    const oy = y0 + (y1 - y0 - (rows - 1) * sy - wh) / 2
    for (let j = 0; j < rows; j++) {
      const y = oy + j * sy
      const f = r()
      let p
      let tone
      if (character === 'office') {
        if (f < 0.13) [p, tone] = [0.9, r() < 0.65 ? 'cool' : 'pale']
        else if (f < 0.3) [p, tone] = [0.32, r() < 0.5 ? 'cool' : 'warm']
        else [p, tone] = [0.025, 'cool']
      } else if (character === 'hotel') {
        ;[p, tone] = [f < 0.12 ? 0.6 : 0.2, 'warm']
      } else {
        ;[p, tone] = [f < 0.07 ? 0.5 : 0.12, 'warm']
      }
      for (let c = 0; c < cols; c++) {
        const x = ox + c * sx
        if (r() > p * rate) continue
        let color = tone
        if (character === 'residential') {
          const q = r()
          color = q < 0.1 ? 'tv' : q < 0.38 ? 'pale' : 'warm'
        } else if (r() < 0.1) {
          color = tone === 'cool' ? 'pale' : 'warm'
        }
        if (L.spec.flicker && L.flick.length < 12 && r() < 0.012) {
          L.flick.push([x, y, color])
          continue
        }
        L.cells[color].push([x, y, ww, wh])
        if (L.spec.halo && r() < 0.4) {
          const g = L.spec.halo
          L.halo.push([x - g, y - g, ww + 2 * g, wh + 2 * g])
        }
      }
    }
  }

  const rim = (L, x0, top) => {
    if (L.spec.rimW) L.rim.push(R(x0, top, x0 + L.spec.rimW, B))
  }

  // Thin vertical piers between window columns, a shade lighter than the wall.
  function piers(L, x0, y0, x1, y1, every) {
    if (!L.spec.detail || L.spec.piers === false) return
    const span = x1 - x0
    const k = Math.max(2, Math.round(span / every))
    for (let i = 1; i < k; i++) {
      const x = x0 + (span * i) / k
      L.detail.push(R(x - 0.35, y0, x + 0.35, y1))
    }
  }

  function beacon(L, x, y) {
    L.beacons.push([x, y])
  }

  // ---------------------------------------------------------- building types
  function deco(L, x, w, h, o = {}) {
    const tiers = o.tiers ?? [[0, 0.57], [0.1, 0.75], [0.2, 0.87], [0.3, 0.94]]
    let below = B
    let topTier = ''
    for (const [ins, frac] of tiers) {
      const x0 = x + w * ins
      const x1 = x + w - w * ins
      const top = B - h * frac
      L.sil.push(R(x0, top, x1, FOOT))
      if (L.spec.detail) {
        L.sil.push(R(x0 - 1.2, top, x1 + 1.2, top + 2))
        piers(L, x0 + 1, top + 3, x1 - 1, below, L.spec.win.sx * 2)
      }
      windows(L, x0 + 1.5, top + 3, x1 - 1.5, below, o.character ?? 'office')
      rim(L, x0, top)
      topTier = R(x0, top, x1, below)
      below = top
    }
    const [insC, fracC] = tiers[tiers.length - 1]
    const c0 = x + w * insC
    const c1 = x + w - w * insC
    const ct = B - h * fracC
    const cw = c1 - c0
    const cx = (c0 + c1) / 2
    const crown = o.crown ?? pick(['needle', 'pyramid', 'stepped', 'sunburst'])
    let crownPath = ''
    let tip
    if (crown === 'sunburst') {
      const arches = []
      let rad = cw / 2
      let y = ct
      for (let k = 0; k < 4; k++) {
        arches.push(`M${n(cx - rad)} ${n(y + 0.6)}A${n(rad)} ${n(rad * 0.92)} 0 0 1 ${n(cx + rad)} ${n(y + 0.6)}Z`)
        // A row of small triangular windows along each arch.
        if (L.spec.detail) {
          const m = 5 + k
          for (let i = 0; i < m; i++) {
            const a = Math.PI * (0.15 + (0.7 * i) / (m - 1))
            const wx = cx - Math.cos(a) * rad * 0.72
            const wy = y - Math.sin(a) * rad * 0.66
            const s = rad * 0.12
            L.lit.pale.push(tri(wx - s * 0.5, wy + s, wx, wy - s * 0.4, wx + s * 0.5, wy + s))
          }
        }
        y -= rad * 0.62
        rad *= 0.72
      }
      crownPath = arches.join('')
      tip = y - h * 0.1
      L.sil.push(crownPath, tri(cx - 1.3, y + 2, cx, tip, cx + 1.3, y + 2))
    } else if (crown === 'pyramid') {
      const apex = ct - cw * 0.9
      crownPath = tri(c0, ct + 0.6, cx, apex, c1, ct + 0.6)
      tip = apex - h * 0.07
      L.sil.push(crownPath, tri(cx - 1, apex + 4, cx, tip, cx + 1, apex + 4))
    } else if (crown === 'stepped') {
      const steps = []
      let a = c0
      let b = c1
      let y = ct
      for (let k = 0; k < 3; k++) {
        a += cw * 0.11
        b -= cw * 0.11
        steps.push(R(a, y - cw * 0.17, b, y + 0.6))
        y -= cw * 0.17
      }
      crownPath = steps.join('')
      tip = y - h * 0.08
      L.sil.push(crownPath, R(cx - 0.8, tip, cx + 0.8, y + 0.6))
    } else {
      crownPath = tri(cx - cw * 0.14, ct + 0.6, cx, ct - h * 0.15, cx + cw * 0.14, ct + 0.6)
      tip = ct - h * 0.15
      L.sil.push(crownPath)
    }
    beacon(L, cx, tip - 1)
    // Floodlit from below, as tall towers are at night.
    if (o.floodlit) L.crowns.push(topTier + crownPath)
  }

  function gothic(L, x, w, h, o = {}) {
    const shaftTop = B - h * 0.72
    L.sil.push(R(x, shaftTop, x + w, FOOT))
    if (L.spec.detail) {
      for (let y = shaftTop + rr(24, 40); y < B - 16; y += rr(48, 78)) L.sil.push(R(x - 1.2, y, x + w + 1.2, y + 1.8))
      piers(L, x + 1, shaftTop + 2, x + w - 1, B, L.spec.win.sx * 2)
    }
    windows(L, x + 2, shaftTop + 6, x + w - 2, B, o.character ?? (r() < 0.5 ? 'office' : 'residential'))
    rim(L, x, shaftTop)
    const pw = Math.max(2, w * 0.13)
    const pinH = h * 0.11
    for (const px of [x, x + w - pw]) {
      L.sil.push(R(px, shaftTop - pinH * 0.5, px + pw, shaftTop + 1), tri(px - 0.3, shaftTop - pinH * 0.5, px + pw / 2, shaftTop - pinH * 1.35, px + pw + 0.3, shaftTop - pinH * 0.5))
    }
    const s0 = x + w * 0.2
    const s1 = x + w * 0.8
    const belfryTop = shaftTop - h * 0.07
    const tipY = B - h
    const sx = (s0 + s1) / 2
    L.sil.push(R(s0, belfryTop, s1, shaftTop + 1))
    if (L.spec.detail) {
      const lw = (s1 - s0) * 0.18
      L.lit.warm.push(lancet(s0 + (s1 - s0) * 0.22, belfryTop + 2, lw, h * 0.05), lancet(s1 - (s1 - s0) * 0.22 - lw, belfryTop + 2, lw, h * 0.05))
    }
    // The spire, its edges set with crockets.
    const steps = Math.max(3, Math.floor((belfryTop - tipY) / 8))
    const bump = Math.max(0.6, w * 0.03)
    const pts = [[s0, belfryTop + 0.5]]
    for (let k = 1; k < steps; k++) {
      const t = k / steps
      const y = belfryTop - (belfryTop - tipY) * t
      const xl = s0 + (sx - s0) * t
      pts.push([xl - bump, y + bump], [xl, y])
    }
    pts.push([sx, tipY])
    for (let k = steps - 1; k >= 1; k--) {
      const t = k / steps
      const y = belfryTop - (belfryTop - tipY) * t
      const xr = s1 - (s1 - sx) * t
      pts.push([xr, y], [xr + bump, y + bump])
    }
    pts.push([s1, belfryTop + 0.5])
    L.sil.push(poly(pts))
    if (o.beacon !== false) beacon(L, sx, tipY - 1)
  }

  function slab(L, x, w, h, o = {}) {
    const top = B - h
    L.sil.push(R(x, top, x + w, FOOT))
    const ph = Math.min(14, h * 0.05)
    L.sil.push(R(x + w * 0.2, top - ph, x + w * 0.8, top + 1))
    if (L.spec.detail) piers(L, x + 1, top + 2, x + w - 1, B, L.spec.win.sx)
    windows(L, x + 1.2, top + 2, x + w - 1.2, B, 'office')
    rim(L, x, top)
    if (o.mast) mast(L, x + w / 2, top - ph, h * 0.3, w * 0.34)
    else if (r() < 0.45) {
      const ax = x + rr(w * 0.3, w * 0.7)
      const ah = rr(12, 28)
      L.sil.push(R(ax - 0.6, top - ph - ah, ax + 0.6, top - ph + 1))
      beacon(L, ax, top - ph - ah - 1)
    }
  }

  function stepped(L, x, w, h) {
    const tiers = 5
    let below = B
    for (let k = 0; k < tiers; k++) {
      const ins = (w * 0.38 * k) / (tiers - 1)
      const top = B - h * (0.5 + (0.5 * k) / (tiers - 1))
      L.sil.push(R(x + ins, top, x + w - ins, FOOT))
      if (L.spec.detail) L.sil.push(R(x + ins - 1, top, x + w - ins + 1, top + 1.6))
      windows(L, x + ins + 1.5, top + 2.5, x + w - ins - 1.5, below, r() < 0.5 ? 'hotel' : 'office')
      rim(L, x + ins, top)
      below = top
    }
  }

  function chimneys(L, x0, x1, top, count) {
    for (let i = 0; i < count; i++) {
      const cx = rr(x0 + 4, x1 - 8)
      const ch = rr(5, 10)
      L.sil.push(R(cx, top - ch, cx + rr(2.5, 4.5), top + 1), R(cx - 0.6, top - ch, cx + 5, top - ch + 1.2))
    }
  }

  function mansard(L, x, w, h) {
    const eave = B - h * 0.84
    const ridge = B - h
    L.sil.push(R(x, eave, x + w, FOOT), poly([[x - 1.5, eave + 0.6], [x + 5, ridge], [x + w - 5, ridge], [x + w + 1.5, eave + 0.6]]))
    if (L.spec.detail) {
      L.sil.push(R(x - 2, eave, x + w + 2, eave + 2.4))
      const count = Math.max(1, Math.floor((w - 14) / 15))
      const dh = (eave - ridge) * 0.62
      for (let k = 0; k < count; k++) {
        const dx = x + 9 + (k * (w - 18)) / Math.max(1, count - 1 || 1)
        if (dx > x + w - 12) break
        L.sil.push(R(dx, eave - dh, dx + 5.5, eave + 1), tri(dx - 1, eave - dh + 0.4, dx + 2.75, eave - dh - 4, dx + 6.5, eave - dh + 0.4))
        if (r() < 0.35) L.lit.warm.push(R(dx + 1.4, eave - dh + 1.6, dx + 4.1, eave - 1))
      }
      chimneys(L, x + 6, x + w - 6, ridge, r() < 0.6 ? 2 : 1)
    }
    windows(L, x + 2, eave + 3, x + w - 2, B, 'residential')
    rim(L, x, eave)
  }

  function waterTower(L, x, base, s) {
    const legH = 9 * s
    const bw = 14 * s
    const bh = 12 * s
    L.sil.push(
      R(x + 1.4 * s, base - legH, x + 2.6 * s, base + 1),
      R(x + bw - 2.6 * s, base - legH, x + bw - 1.4 * s, base + 1),
      R(x + 1 * s, base - legH * 0.5, x + bw - 1 * s, base - legH * 0.5 + 0.7 * s),
      R(x, base - legH - bh, x + bw, base - legH + 0.5),
      tri(x - 0.9 * s, base - legH - bh + 0.5, x + bw / 2, base - legH - bh - 6 * s, x + bw + 0.9 * s, base - legH - bh + 0.5),
    )
    if (L.spec.detail) {
      for (const f of [0.3, 0.68]) L.detail.push(R(x, base - legH - bh * f, x + bw, base - legH - bh * f + 0.45 * s))
    }
  }

  function fireEscape(L, x0, x1, y0, y1) {
    const sy = L.spec.win.sy
    for (let y = y0 + sy * 0.95; y < y1 - sy * 0.5; y += sy) {
      L.over.push(R(x0, y, x1, y + 1.1))
      L.overLines.push(`M${n(x0 + 1.5)} ${n(y)}L${n(x1 - 1.5)} ${n(y - sy + 1.2)}`)
    }
    L.overLines.push(`M${n(x0)} ${n(y0 + sy * 0.95)}V${n(y1)}M${n(x1)} ${n(y0 + sy * 0.95)}V${n(y1)}`)
  }

  function tenement(L, x, w, h) {
    const top = B - h
    L.sil.push(R(x, top, x + w, FOOT))
    if (L.spec.detail) {
      L.sil.push(R(x - 2.4, top, x + w + 2.4, top + 3.2), R(x - 1.2, top + 3.2, x + w + 1.2, top + 4.6))
      if (w > 40 && r() < 0.75) waterTower(L, x + rr(6, w - 6 - 14 * L.spec.towerScale), top, L.spec.towerScale)
      chimneys(L, x + 4, x + w - 4, top, r() < 0.5 ? 2 : 1)
    }
    windows(L, x + 3, top + 6, x + w - 3, B, r() < 0.15 ? 'hotel' : 'residential')
    if (L.spec.fireEscapes && w > 60 && r() < 0.7) {
      const side = r() < 0.5
      const fw = Math.min(26, w * 0.28)
      const fx = side ? x + 4 : x + w - 4 - fw
      fireEscape(L, fx, fx + fw, top + 6, B - 8)
    }
    rim(L, x, top)
  }

  function warehouse(L, x, w, h) {
    const top = B - h
    L.sil.push(R(x, top, x + w, FOOT))
    const teeth = Math.max(3, Math.round(w / 22))
    const tw = w / teeth
    for (let k = 0; k < teeth; k++) L.sil.push(tri(x + k * tw, top + 0.6, x + k * tw, top - tw * 0.55, x + (k + 1) * tw, top + 0.6))
    if (r() < 0.6) {
      const sx = x + rr(w * 0.6, w * 0.85)
      const shh = rr(40, 70)
      L.sil.push(R(sx, top - shh, sx + 5, top + 1), R(sx - 0.8, top - shh, sx + 5.8, top - shh + 2))
    }
    // Factory windows in bays, a few lit dim amber, crossed by glazing bars.
    const { sy } = L.spec.win
    const bays = Math.max(2, Math.floor(w / 24))
    const bw = (w - 8) / bays
    for (let b = 0; b < bays; b++) {
      const ww = Math.min(14, bw - 8)
      const bx = x + 4 + b * bw + (bw - ww) / 2
      for (let y = top + 12; y < B - 18; y += sy * 1.6) {
        if (r() < 0.2) {
          const wh = sy * 0.9
          L.lit.amber.push(R(bx, y, bx + ww, y + wh))
          L.over.push(R(bx + ww / 2 - 0.35, y, bx + ww / 2 + 0.35, y + wh), R(bx, y + wh / 2 - 0.35, bx + ww, y + wh / 2 + 0.35))
        }
      }
    }
    rim(L, x, top)
  }

  function cathedral(L, x, w, h) {
    const naveTop = B - h * 0.42
    const ridge = B - h * 0.55
    const front = x + w * 0.3
    L.sil.push(R(front, naveTop, x + w, FOOT), poly([[front, naveTop + 0.6], [front + w * 0.05, ridge], [x + w - w * 0.03, ridge], [x + w, naveTop + 0.6]]))
    // Buttress pinnacles along the nave, and stained glass between them.
    const bays = 7
    const bayW = (x + w - front - w * 0.04) / bays
    const glass = ['#c98f4a', '#a65650', '#5a6fa8', '#c98f4a', '#76609e']
    for (let k = 0; k <= bays; k++) {
      const px = front + w * 0.02 + k * bayW
      L.sil.push(R(px - 1.4, naveTop - 10, px + 1.4, FOOT), tri(px - 1.6, naveTop - 10, px, naveTop - 18, px + 1.6, naveTop - 10))
      if (k < bays) {
        const gx = px + bayW * 0.3
        const gw = bayW * 0.4
        L.extras.push(`<path d="${lancet(gx, naveTop + 12, gw, (B - naveTop) * 0.3)}" fill="${glass[k % glass.length]}" opacity=".38"/>`)
      }
    }
    // The west front: two towers with spires, a gable, and a rose window.
    const tw = w * 0.11
    const towerTop = B - h * 0.78
    for (const tx of [x, front - tw]) {
      L.sil.push(R(tx, towerTop, tx + tw, FOOT), tri(tx - 0.5, towerTop + 0.6, tx + tw / 2, B - h, tx + tw + 0.5, towerTop + 0.6))
      L.sil.push(R(tx - 1, towerTop, tx + tw + 1, towerTop + 2))
      for (const px of [tx, tx + tw - 2]) L.sil.push(tri(px - 0.4, towerTop + 0.6, px + 1, towerTop - 9, px + 2.4, towerTop + 0.6))
      L.lit.warm.push(lancet(tx + tw * 0.3, towerTop + 12, tw * 0.4, h * 0.1))
    }
    const fx0 = x + tw
    const fx1 = front - tw
    const gableTop = B - h * 0.66
    L.sil.push(R(fx0, B - h * 0.56, fx1, FOOT), tri(fx0 - 0.5, B - h * 0.56 + 0.6, (fx0 + fx1) / 2, gableTop, fx1 + 0.5, B - h * 0.56 + 0.6))
    const rcx = (fx0 + fx1) / 2
    const rcy = B - h * 0.43
    const rad = (fx1 - fx0) * 0.4
    const spokes = []
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 * i) / 12
      spokes.push(`M${n(rcx)} ${n(rcy)}L${n(rcx + Math.cos(a) * rad)} ${n(rcy + Math.sin(a) * rad)}`)
    }
    L.extras.push(
      `<circle cx="${n(rcx)}" cy="${n(rcy)}" r="${n(rad)}" fill="url(#rose)"/>`,
      `<path d="${spokes.join('')}M${n(rcx + rad * 0.45)} ${n(rcy)}A${n(rad * 0.45)} ${n(rad * 0.45)} 0 1 0 ${n(rcx - rad * 0.45)} ${n(rcy)}A${n(rad * 0.45)} ${n(rad * 0.45)} 0 1 0 ${n(rcx + rad * 0.45)} ${n(rcy)}" stroke="${L.spec.fill}" stroke-width=".9" fill="none"/>`,
    )
    // The doors, lit from inside.
    L.lit.warm.push(lancet(rcx - rad * 0.4, B - h * 0.17, rad * 0.8, h * 0.17))
    rim(L, x, towerTop)
  }

  function dome(L, x, w, h) {
    const baseTop = B - h * 0.42
    L.sil.push(R(x, baseTop, x + w, FOOT), R(x - 2, baseTop, x + w + 2, baseTop + 2.6))
    // A portico: a pediment over columns.
    const p0 = x + w * 0.32
    const p1 = x + w * 0.68
    L.sil.push(tri(p0 - 2, baseTop + 0.6, (p0 + p1) / 2, baseTop - w * 0.07, p1 + 2, baseTop + 0.6))
    const d0 = x + w * 0.25
    const d1 = x + w * 0.75
    const drumTop = B - h * 0.6
    L.sil.push(R(d0, drumTop, d1, baseTop + 1), R(d0 - 2, drumTop, d1 + 2, drumTop + 2.4))
    // Between the drum's columns, a glow from inside.
    const cols = 9
    for (let i = 0; i < cols; i++) {
      const cx0 = d0 + 3 + (i * (d1 - d0 - 6)) / cols
      L.lit.amber.push(R(cx0 + 1.4, drumTop + 5, cx0 + (d1 - d0 - 6) / cols - 1.4, baseTop - 4))
    }
    const cx = (d0 + d1) / 2
    const rx = (d1 - d0) / 2 + 2
    const ry = h * 0.24
    const domePath = `M${n(cx - rx)} ${n(drumTop + 0.6)}A${n(rx)} ${n(ry)} 0 0 1 ${n(cx + rx)} ${n(drumTop + 0.6)}Z`
    const lanternTop = drumTop - ry - h * 0.07
    L.sil.push(domePath, R(cx - rx * 0.12, lanternTop, cx + rx * 0.12, drumTop - ry + 3), `M${n(cx - rx * 0.15)} ${n(lanternTop + 0.5)}A${n(rx * 0.15)} ${n(rx * 0.12)} 0 0 1 ${n(cx + rx * 0.15)} ${n(lanternTop + 0.5)}Z`, tri(cx - 0.9, lanternTop - rx * 0.1, cx, lanternTop - h * 0.12, cx + 0.9, lanternTop - rx * 0.1))
    // Ribs on the dome, a shade lighter.
    for (const f of [-0.6, -0.3, 0, 0.3, 0.6]) {
      L.ribs.push(`M${n(cx + rx * f)} ${n(drumTop)}Q${n(cx + rx * f * 0.8)} ${n(drumTop - ry * 0.85)} ${n(cx)} ${n(drumTop - ry)}`)
    }
    L.lit.pale.push(R(cx - rx * 0.07, lanternTop + 3, cx + rx * 0.07, drumTop - ry))
    L.crowns.push(domePath + R(d0, drumTop, d1, baseTop))
    windows(L, x + 3, baseTop + 5, x + w - 3, B, 'hotel')
    rim(L, x, baseTop)
  }

  function mast(L, cx, base, H, bw) {
    const top = base - H
    const out = [`M${n(cx - bw / 2)} ${n(base)}L${n(cx)} ${n(top)}L${n(cx + bw / 2)} ${n(base)}`]
    const m = Math.max(4, Math.round(H / 9))
    let side = -1
    out.push(`M${n(cx - bw / 2)} ${n(base)}`)
    for (let k = 1; k <= m; k++) {
      const y = base - (H * k) / m
      const half = (bw / 2) * (1 - k / m)
      out.push(`L${n(cx + side * half)} ${n(y)}`)
      side = -side
    }
    L.lines.push(out.join(''))
    beacon(L, cx, top - 1)
    beacon(L, cx, base - H * 0.5)
  }

  const BUILD = { deco, gothic, slab, stepped, mansard, tenement, warehouse, cathedral, dome }

  // ---------------------------------------------------------- layout
  const bell = (x, c, s) => Math.exp(-(((x - c) / s) ** 2))
  // Downtown rises in the middle, with a second cluster to the right.
  const skyline = x => Math.min(1, 0.36 + 0.64 * bell(x, 1180, 380) + 0.42 * bell(x, 1780, 250) + 0.26 * bell(x, 560, 260))

  function layout(L, { from, to, wMin, wMax, gap, tall, low, landmarks = [], height, lowZones = [] }) {
    const marks = landmarks.map(m => ({ ...m }))
    let x = from
    while (x < to) {
      const mark = marks.find(m => !m.done && m.at <= x + 6)
      if (mark) {
        mark.done = true
        BUILD[mark.kind](L, mark.at, mark.w, mark.h, mark)
        x = mark.at + mark.w + rr(gap[0], gap[1])
        continue
      }
      const next = marks.find(m => !m.done && m.at > x)
      let w = rr(wMin, wMax)
      if (next && x + w > next.at - gap[0] - 2) w = next.at - gap[0] - 2 - x
      if (w < wMin * 0.5) {
        x = next ? next.at : x + wMin
        continue
      }
      let h = height(x + w / 2)
      for (const [z0, z1, cap] of lowZones) if (x + w > z0 && x < z1) h = Math.min(h, cap * rr(0.7, 1))
      const kinds = h > L.spec.tallAbove ? tall : low
      BUILD[pick(kinds)](L, x, w, h, {})
      x += w + rr(gap[0], gap[1])
    }
  }

  // ---------------------------------------------------------- the four depths
  const haze = layerOf({
    fill: '#151d2a', detail: false, rimW: 0, tallAbove: 220,
    win: { sx: 3.6, sy: 5.4, ww: 1.3, wh: 1.9, rate: 0.1 }, litOpacity: 0.4,
  })
  layout(haze, {
    from: -100, to: 2500, wMin: 22, wMax: 64, gap: [-5, 2],
    tall: ['slab', 'deco', 'slab', 'stepped', 'gothic'], low: ['slab', 'stepped', 'slab'],
    height: x => 110 + 330 * skyline(x) * rr(0.55, 1.05),
  })

  const far = layerOf({
    fill: '#0f1520', detail: true, piers: false, rimW: 0, tallAbove: 200,
    win: { sx: 4.6, sy: 7, ww: 1.8, wh: 2.7, rate: 0.55 }, litOpacity: 0.6,
  })
  layout(far, {
    from: -80, to: 2480, wMin: 26, wMax: 82, gap: [-2, 4],
    tall: ['deco', 'slab', 'gothic', 'stepped', 'deco', 'slab'], low: ['mansard', 'slab', 'stepped', 'tenement'],
    landmarks: [
      { at: 690, kind: 'gothic', w: 50, h: 360 },
      { at: 1120, kind: 'deco', w: 92, h: 450, crown: 'sunburst', floodlit: true },
      { at: 1690, kind: 'slab', w: 58, h: 400, mast: true },
      { at: 1950, kind: 'deco', w: 80, h: 380, crown: 'pyramid', floodlit: true },
    ],
    height: x => 100 + 300 * skyline(x) * rr(0.5, 1.05),
  })

  const mid = layerOf({
    fill: '#0a0f18', detail: true, rimW: 1.1, tallAbove: 170, flicker: true, towerScale: 1,
    win: { sx: 6.4, sy: 9.4, ww: 2.7, wh: 4.1, rate: 1 }, litOpacity: 0.85,
  })
  layout(mid, {
    from: -60, to: 2460, wMin: 44, wMax: 120, gap: [1, 9],
    tall: ['deco', 'gothic', 'slab', 'stepped'], low: ['mansard', 'tenement', 'tenement', 'mansard', 'slab'],
    landmarks: [
      { at: 400, kind: 'gothic', w: 64, h: 290 },
      { at: 830, kind: 'cathedral', w: 200, h: 300 },
      { at: 1260, kind: 'deco', w: 88, h: 340, crown: 'stepped', floodlit: true },
      { at: 1500, kind: 'dome', w: 160, h: 230 },
    ],
    height: x => 70 + 230 * skyline(x) * rr(0.45, 1),
  })

  const near = layerOf({
    fill: '#05070b', detail: true, rimW: 1.4, tallAbove: 9999, halo: 2.2, fireEscapes: true, towerScale: 1.5,
    win: { sx: 11, sy: 15, ww: 5, wh: 7.6, rate: 0.9 }, litOpacity: 0.9,
  })
  layout(near, {
    from: -60, to: 2460, wMin: 90, wMax: 210, gap: [2, 12],
    tall: [], low: ['tenement', 'mansard', 'warehouse', 'tenement'],
    lowZones: [[800, 1050, 64], [1480, 1680, 76]],
    height: x => 52 + 120 * rr(0.4, 1) * (0.6 + 0.4 * skyline(x)),
  })

  return { layers: [haze, far, mid, near], n, R }
}

/**
 * Same-sized rectangles as one stroked path: each a short vertical stroke as
 * wide as the window, placed relative to the end of the last. Half the text
 * of drawing each as a box.
 */
function cellsPath(cells, n, round) {
  const q = round ? Math.round : v => Math.round(v * 10) / 10
  let out = ''
  let px = 0
  let py = 0
  for (const [i, [x, y, w, h]] of cells.entries()) {
    const [cx, cy, ch] = [q(x + w / 2), q(y), q(h)]
    out += i === 0 ? `M${n(cx)} ${n(cy)}` : `m${n(cx - px)} ${n(cy - py)}`
    out += `v${n(ch)}`
    ;[px, py] = [cx, cy + ch]
  }
  return out
}

const roundAll = d => d.replace(/-?\d+\.\d+/g, m => String(Math.round(Number(m))))

/** The layers as SVG markup, back to front, with haze between them. */
export function cityMarkup({ layers, n }, beacon) {
  const out = []
  const fogs = ['url(#fog1)', 'url(#fog2)', 'url(#fog3)', null]
  let beaconIndex = 0
  let flickIndex = 0
  layers.forEach((L, i) => {
    const s = L.spec
    const lighter = { '#151d2a': '#1b2433', '#0f1520': '#182131', '#0a0f18': '#141c2a', '#05070b': '#0f141d' }[s.fill]
    const far = i < 2
    out.push(`<path d="${far ? roundAll(L.sil.join('')) : L.sil.join('')}" fill="${s.fill}"/>`)
    if (L.detail.length) out.push(`<path d="${L.detail.join('')}" fill="${lighter}" opacity=".7"/>`)
    if (L.rim.length) out.push(`<path d="${L.rim.join('')}" fill="#33415c" opacity=".45"/>`)
    if (L.lines.length) out.push(`<path d="${L.lines.join('')}" stroke="${s.fill}" stroke-width="${i < 2 ? 0.7 : 1}" fill="none"/>`)
    for (const c of L.crowns) out.push(`<path d="${c}" fill="url(#flood)"/>`)
    if (L.ribs.length) out.push(`<path d="${L.ribs.join('')}" stroke="#c98d43" stroke-opacity=".35" stroke-width=".8" fill="none"/>`)
    if (L.halo.length) out.push(`<path d="${cellsPath(L.halo, n)}" stroke="#f2b45a" stroke-width="${n(L.halo[0][2])}" opacity=".07"/>`)
    const tones = { warm: '#f3b45c', pale: '#ffdfa6', cool: '#c3daf5', tv: '#86a8ea', amber: '#a9824e' }
    const lit = Object.keys(tones).map(k => {
      const cells = L.cells[k] ?? []
      const strokes = cells.length ? `<path d="${cellsPath(cells, n, far)}" stroke="${tones[k]}" stroke-width="${n(s.win.ww)}"/>` : ''
      const shapes = L.lit[k].length ? `<path d="${L.lit[k].join('')}" fill="${tones[k]}"/>` : ''
      return strokes + shapes
    })
    out.push(`<g opacity="${s.litOpacity}">${lit.join('')}${L.flick.map(([x, y, c]) => `<path class="fk k${flickIndex++ % 4}" d="M${n(x)} ${n(y)}h${n(s.win.ww)}v${n(s.win.wh)}h-${n(s.win.ww)}z" fill="${tones[c]}"/>`).join('')}</g>`)
    out.push(...L.extras)
    if (L.over.length) out.push(`<path d="${L.over.join('')}" fill="${s.fill}"/>`)
    if (L.overLines.length) out.push(`<path d="${L.overLines.join('')}" stroke="${s.fill}" stroke-width="1.1" fill="none"/>`)
    for (const [x, y] of L.beacons.filter((_, k) => k % (i === 0 ? 3 : 1) === 0).slice(0, i === 0 ? 4 : 8)) out.push(beacon([x, y], beaconIndex++))
    if (fogs[i]) out.push(`<rect x="-600" y="${i === 2 ? 420 : 140}" width="3600" height="${i === 2 ? 260 : 540}" fill="${fogs[i]}"/>`)
    if (i === 1) out.push('<g class="mist"><rect x="-600" y="380" width="3600" height="180" fill="url(#mist)"/></g>')
    if (i === 2) out.push('<g class="mist m2"><rect x="-600" y="520" width="3600" height="140" fill="url(#mist)"/></g><rect x="-600" y="540" width="3600" height="140" fill="url(#street)"/>')
  })
  return out.join('')
}
