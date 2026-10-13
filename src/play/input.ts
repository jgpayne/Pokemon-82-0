import type { PlayInput, Vec } from './engine'

/**
 * Collects keyboard and touch input. Two buttons cover everything, NBA Jam style:
 *  A — hold/release to shoot on offense; tap to steal or block on defense.
 *  B — pass on offense; switch to the defender nearest the ball on defense.
 * Plus turbo (sprint). Movement is in screen space and rotated into court space
 * by `toWorld` when the court is drawn vertically.
 */
export class InputController {
  private keys = new Set<string>()
  stick: Vec = { x: 0, y: 0 }
  aHeld = false
  turboHeld = false
  private aPressed = false
  private bPressed = false

  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase()
    if (GAME_KEYS.has(k)) e.preventDefault()
    if (e.repeat) return
    this.keys.add(k)
    if (k === 'j' || k === ' ' || k === 'z') this.pressA()
    if (k === 'k' || k === 'x') this.pressB()
  }

  private onKeyUp = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase()
    this.keys.delete(k)
    if (k === 'j' || k === ' ' || k === 'z') this.aHeld = false
  }

  private onBlur = () => this.reset()

  attach() {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.onBlur)
  }

  detach() {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.onBlur)
  }

  reset() {
    this.keys.clear()
    this.stick = { x: 0, y: 0 }
    this.aHeld = this.turboHeld = this.aPressed = this.bPressed = false
  }

  pressA() {
    this.aHeld = true
    this.aPressed = true
  }

  releaseA() {
    this.aHeld = false
  }

  pressB() {
    this.bPressed = true
  }

  setStick(v: Vec) {
    this.stick = v
  }

  setTurbo(on: boolean) {
    this.turboHeld = on
  }

  /** Screen-space movement from keys or the touch stick (x right, y down). */
  private screenMove(): Vec {
    let x = this.stick.x
    let y = this.stick.y
    const k = this.keys
    if (k.has('arrowleft') || k.has('a')) x -= 1
    if (k.has('arrowright') || k.has('d')) x += 1
    if (k.has('arrowup') || k.has('w')) y -= 1
    if (k.has('arrowdown') || k.has('s')) y += 1
    const len = Math.hypot(x, y)
    return len > 1 ? { x: x / len, y: y / len } : { x, y }
  }

  /** Read this frame's input (court space) and clear one-shot presses. */
  read(rotated: boolean): PlayInput {
    const m = toWorld(this.screenMove(), rotated)
    const input: PlayInput = {
      move: m,
      shoot: this.aHeld,
      action: this.aPressed,
      pass: this.bPressed,
      turbo: this.turboHeld || this.keys.has('shift') || this.keys.has('l'),
    }
    this.aPressed = false
    this.bPressed = false
    return input
  }
}

const GAME_KEYS = new Set(['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' ', 'j', 'k', 'z', 'x', 'w', 'a', 's', 'd', 'l', 'shift'])

/** Portrait mode draws the court rotated 90° (team 0 attacking up), so screen right = court +y, screen down = court -x. */
export function toWorld(v: Vec, rotated: boolean): Vec {
  return rotated ? { x: -v.y, y: v.x } : v
}
