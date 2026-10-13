import { BASKET_X, BASKET_Y, COURT, type Actor, type PlayState, type Vec } from './engine'

export interface View {
  /** CSS pixels */
  width: number
  height: number
  dpr: number
  /** Portrait: court drawn vertically with team 0 attacking up. */
  rotated: boolean
  scale: number
  ox: number
  oy: number
}

const MARGIN = 2 // ft of apron around the court

export function makeView(width: number, height: number, dpr: number): View {
  const rotated = height > width
  const cw = (rotated ? COURT.h : COURT.w) + MARGIN * 2
  const ch = (rotated ? COURT.w : COURT.h) + MARGIN * 2
  const scale = Math.min(width / cw, height / ch)
  return { width, height, dpr, rotated, scale, ox: (width - cw * scale) / 2 + MARGIN * scale, oy: (height - ch * scale) / 2 + MARGIN * scale }
}

/** Court feet → CSS pixels. */
export function toScreen(v: View, p: Vec): Vec {
  return v.rotated
    ? { x: v.ox + p.y * v.scale, y: v.oy + (COURT.w - p.x) * v.scale }
    : { x: v.ox + p.x * v.scale, y: v.oy + p.y * v.scale }
}

const courtCache = new Map<string, HTMLCanvasElement>()

function drawCourt(v: View): HTMLCanvasElement {
  const key = `${v.width}x${v.height}@${v.dpr}`
  const hit = courtCache.get(key)
  if (hit) return hit
  courtCache.clear()
  const c = document.createElement('canvas')
  c.width = Math.round(v.width * v.dpr)
  c.height = Math.round(v.height * v.dpr)
  const g = c.getContext('2d')!
  g.scale(v.dpr, v.dpr)
  const s = v.scale
  const P = (x: number, y: number) => toScreen(v, { x, y })

  // Hardwood
  const tl = P(0, 0)
  const br = P(COURT.w, COURT.h)
  const x0 = Math.min(tl.x, br.x)
  const y0 = Math.min(tl.y, br.y)
  const w = Math.abs(br.x - tl.x)
  const h = Math.abs(br.y - tl.y)
  const wood = g.createLinearGradient(x0, y0, x0 + w, y0 + h)
  wood.addColorStop(0, '#d39a5c')
  wood.addColorStop(1, '#b97a3e')
  g.fillStyle = wood
  g.fillRect(x0, y0, w, h)
  g.strokeStyle = 'rgba(0,0,0,0.08)'
  g.lineWidth = 1
  for (let i = 0; i < 94; i += 2.2) {
    const a = P(i, 0)
    const b = P(i, COURT.h)
    g.beginPath()
    g.moveTo(a.x, a.y)
    g.lineTo(b.x, b.y)
    g.stroke()
  }

  // Painted lanes
  g.fillStyle = 'rgba(239,68,68,0.32)'
  for (const bx of [0, COURT.w - 19]) {
    const a = P(bx, 17)
    const b = P(bx + 19, 33)
    g.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y))
  }

  g.strokeStyle = 'rgba(255,255,255,0.9)'
  g.lineWidth = Math.max(1.5, s * 0.17)
  const line = (pts: [number, number][]) => {
    g.beginPath()
    pts.forEach(([x, y], i) => {
      const p = P(x, y)
      if (i) g.lineTo(p.x, p.y)
      else g.moveTo(p.x, p.y)
    })
    g.stroke()
  }
  const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => {
    const pts: [number, number][] = []
    for (let i = 0; i <= 40; i++) {
      const a = a0 + ((a1 - a0) * i) / 40
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
    }
    line(pts)
  }
  line([[0, 0], [COURT.w, 0], [COURT.w, COURT.h], [0, COURT.h], [0, 0]])
  line([[47, 0], [47, 50]])
  arc(47, 25, 6, 0, Math.PI * 2)
  for (const [bx, dir] of [[BASKET_X[1], 1], [BASKET_X[0], -1]] as const) {
    const edge = dir === 1 ? 0 : COURT.w
    // Lane and free-throw circle
    line([[edge, 17], [edge + dir * 19, 17], [edge + dir * 19, 33], [edge, 33]])
    arc(edge + dir * 19, 25, 6, 0, Math.PI * 2)
    // Three-point line: corners + arc
    const cornerX = bx + dir * Math.sqrt(23.75 ** 2 - 22 ** 2)
    line([[edge, 3], [cornerX, 3]])
    line([[edge, 47], [cornerX, 47]])
    // The arc meets the corner lines 22 ft from the basket's centre line.
    const theta = Math.asin(22 / 23.75)
    const facing = dir === 1 ? 0 : Math.PI
    arc(bx, BASKET_Y, 23.75, facing - theta, facing + theta)
    // Backboard and rim
    g.lineWidth = Math.max(2, s * 0.35)
    line([[edge + dir * 4, 22], [edge + dir * 4, 28]])
    g.strokeStyle = '#f97316'
    g.lineWidth = Math.max(1.5, s * 0.2)
    arc(bx, BASKET_Y, 0.9, 0, Math.PI * 2)
    g.strokeStyle = 'rgba(255,255,255,0.9)'
    g.lineWidth = Math.max(1.5, s * 0.17)
  }
  courtCache.set(key, c)
  return c
}

export function render(g: CanvasRenderingContext2D, v: View, s: PlayState, sprites: Map<number, HTMLImageElement>) {
  g.setTransform(v.dpr, 0, 0, v.dpr, 0, 0)
  g.fillStyle = '#0b1020'
  g.fillRect(0, 0, v.width, v.height)
  g.drawImage(drawCourt(v), 0, 0, v.width, v.height)

  const sc = v.scale
  const up = (p: Vec, z: number) => ({ x: p.x, y: p.y - z * sc * 0.45 })

  // Draw back-to-front for a hint of depth.
  const actors = [...s.court[0], ...s.court[1]].sort((a, b) => toScreen(v, a).y - toScreen(v, b).y)
  for (const a of actors) drawActor(g, v, s, a, sprites)

  // Ball shadow + ball
  const bp = toScreen(v, s.ball)
  const br = Math.max(3, sc * 0.75)
  g.fillStyle = 'rgba(0,0,0,0.35)'
  g.beginPath()
  g.ellipse(bp.x, bp.y, br, br * 0.55, 0, 0, Math.PI * 2)
  g.fill()
  const lifted = up(bp, s.ball.z)
  const grad = g.createRadialGradient(lifted.x - br * 0.3, lifted.y - br * 0.3, br * 0.2, lifted.x, lifted.y, br)
  grad.addColorStop(0, '#fdba74')
  grad.addColorStop(1, '#c2410c')
  g.fillStyle = grad
  g.beginPath()
  g.arc(lifted.x, lifted.y, br, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = 'rgba(0,0,0,0.5)'
  g.lineWidth = 1
  g.stroke()

  // Shot meter for the user's shooter
  if (s.meter !== null && s.controlled) {
    const p = toScreen(v, s.controlled)
    const h = sc * 7
    const x = p.x + s.controlled.radius * sc + 6
    const y = p.y - h / 2
    g.fillStyle = 'rgba(11,16,32,0.85)'
    g.fillRect(x - 2, y - 2, 12, h + 4)
    const frac = (m: number) => Math.min(1, m / 1.25)
    g.fillStyle = 'rgba(34,197,94,0.55)'
    g.fillRect(x, y + h * (1 - frac(0.9)), 8, h * (frac(0.9) - frac(0.8)))
    g.fillStyle = s.meter > 1 ? '#f43f5e' : '#facc15'
    g.fillRect(x, y + h * (1 - frac(s.meter)), 8, h * frac(s.meter))
  }

  // Floating text
  g.textAlign = 'center'
  for (const t of s.texts) {
    const p = toScreen(v, t)
    const alpha = Math.max(0, 1 - t.t / 1.4)
    g.globalAlpha = alpha
    g.font = `bold ${Math.max(12, sc * 2.4)}px "Russo One", system-ui`
    g.lineWidth = 4
    g.strokeStyle = 'rgba(11,16,32,0.9)'
    const y = p.y - t.t * sc * 6
    g.strokeText(t.text, p.x, y)
    g.fillStyle = t.color
    g.fillText(t.text, p.x, y)
  }
  g.globalAlpha = 1
}

function drawActor(g: CanvasRenderingContext2D, v: View, s: PlayState, a: Actor, sprites: Map<number, HTMLImageElement>) {
  const sc = v.scale
  const p = toScreen(v, a)
  const r = a.radius * sc
  const color = s.teams[a.team].color
  const controlled = a === s.controlled

  // Shadow
  g.fillStyle = 'rgba(0,0,0,0.3)'
  g.beginPath()
  g.ellipse(p.x, p.y + r * 0.7, r * 0.9, r * 0.4, 0, 0, Math.PI * 2)
  g.fill()

  const lift = a.jump > 0 ? Math.sin((a.jump / 0.4) * Math.PI) * r * 0.6 : 0
  const cy = p.y - lift

  if (a.onFire) {
    g.save()
    g.shadowColor = '#f97316'
    g.shadowBlur = 18
  }
  g.fillStyle = 'rgba(11,16,32,0.85)'
  g.beginPath()
  g.arc(p.x, cy, r, 0, Math.PI * 2)
  g.fill()
  if (a.onFire) g.restore()

  const img = sprites.get(a.mon.id)
  if (img?.complete && img.naturalWidth) {
    g.save()
    g.beginPath()
    g.arc(p.x, cy, r * 0.95, 0, Math.PI * 2)
    g.clip()
    g.drawImage(img, p.x - r * 1.1, cy - r * 1.15, r * 2.2, r * 2.2)
    g.restore()
  }
  g.lineWidth = Math.max(2, sc * 0.3)
  g.strokeStyle = a.team === 0 ? '#ef4444' : color
  g.beginPath()
  g.arc(p.x, cy, r, 0, Math.PI * 2)
  g.stroke()

  if (controlled) {
    const pulse = 0.5 + 0.5 * Math.sin(s.time * 8)
    g.strokeStyle = `rgba(250,204,21,${0.6 + 0.4 * pulse})`
    g.lineWidth = Math.max(2.5, sc * 0.4)
    g.beginPath()
    g.arc(p.x, cy, r + 3 + pulse * 2, 0, Math.PI * 2)
    g.stroke()
    // Pointer above the controlled player
    g.fillStyle = '#facc15'
    g.beginPath()
    g.moveTo(p.x, cy - r - 4)
    g.lineTo(p.x - 6, cy - r - 13)
    g.lineTo(p.x + 6, cy - r - 13)
    g.closePath()
    g.fill()
  }

  // Name tag for the controlled player and the ball handler.
  if (controlled || s.ball.holder === a) {
    g.font = `bold ${Math.max(10, sc * 1.25)}px "Chakra Petch", system-ui`
    g.textAlign = 'center'
    g.fillStyle = 'rgba(11,16,32,0.8)'
    const label = a.mon.name
    const tw = g.measureText(label).width + 8
    g.fillRect(p.x - tw / 2, p.y + r + 2, tw, Math.max(13, sc * 1.6))
    g.fillStyle = controlled ? '#facc15' : '#ffffff'
    g.fillText(label, p.x, p.y + r + Math.max(11, sc * 1.3))
  }
}
