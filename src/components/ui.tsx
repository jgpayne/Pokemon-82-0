import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { spriteUrl, TYPE_COLORS, type PokeType } from '../data/pokedex'
import { grade } from '../engine/ratings'
import { cx } from '../lib/cx'

type Variant = 'primary' | 'secondary' | 'ghost' | 'accent'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-white shadow-[0_6px_0_#991b1b] hover:bg-primary-strong active:translate-y-1 active:shadow-[0_2px_0_#991b1b]',
  secondary: 'bg-secondary text-white shadow-[0_6px_0_#1e3a8a] hover:bg-blue-600 active:translate-y-1 active:shadow-[0_2px_0_#1e3a8a]',
  accent: 'bg-accent text-slate-950 shadow-[0_6px_0_#a16207] hover:bg-yellow-300 active:translate-y-1 active:shadow-[0_2px_0_#a16207]',
  ghost: 'bg-white/5 text-fg ring-1 ring-line hover:bg-white/10',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      {...rest}
      className={cx(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-display uppercase tracking-wide transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none',
        size === 'sm' && 'min-h-11 px-4 text-sm',
        size === 'md' && 'min-h-12 px-6 text-base',
        size === 'lg' && 'min-h-16 px-6 text-lg sm:px-8 sm:text-xl',
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </button>
  )
}

export function TypeBadge({ type, size = 'sm' }: { type: PokeType | 'wild'; size?: 'sm' | 'lg' }) {
  const color = type === 'wild' ? '#facc15' : TYPE_COLORS[type]
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-md font-display uppercase tracking-wider text-slate-950',
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2.5 py-1 text-lg sm:px-4 sm:py-1.5 sm:text-2xl',
      )}
      style={{ background: type === 'wild' ? 'linear-gradient(90deg,#f43f5e,#facc15,#22c55e,#3b82f6)' : color }}
    >
      {type === 'wild' ? 'Wild card' : type}
    </span>
  )
}

export function Sprite({ id, name, className }: { id: number; name: string; className?: string }) {
  return (
    <img
      src={spriteUrl(id)}
      alt={name}
      width={256}
      height={256}
      loading="lazy"
      draggable={false}
      className={cx('object-contain drop-shadow-[0_8px_12px_rgba(0,0,0,0.45)]', className)}
    />
  )
}

const GRADE_COLORS: Record<string, string> = {
  S: 'bg-accent text-slate-950',
  A: 'bg-win text-slate-950',
  B: 'bg-secondary text-white',
  C: 'bg-slate-400 text-slate-950',
  D: 'bg-orange-500 text-slate-950',
  F: 'bg-loss text-white',
}

export function OvrChip({ ovr, label, className }: { ovr: number; label?: string; className?: string }) {
  const g = grade(ovr)
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-display text-xs tabular-nums', GRADE_COLORS[g], className)}>
      {label && <span className="opacity-80">{label}</span>}
      {ovr}
    </span>
  )
}

export function RatingBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? '#22c55e' : value >= 65 ? '#facc15' : value >= 50 ? '#f97316' : '#f43f5e'
  return (
    <div className="grid grid-cols-[74px_1fr_24px] items-center gap-2 text-xs">
      <span className="text-muted">{label}</span>
      <span className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <span className="block h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </span>
      <span className="text-right font-semibold tabular-nums">{value}</span>
    </div>
  )
}

export function TeamLogo({ abbr, color, size = 40 }: { abbr: string; color: string; size?: number }) {
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full font-display text-white ring-2 ring-white/20"
      style={{ width: size, height: size, background: `radial-gradient(circle at 30% 30%, ${color}, #0b1020 120%)`, fontSize: size * 0.3 }}
      aria-hidden
    >
      {abbr}
    </span>
  )
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx('rounded-2xl bg-surface/90 ring-1 ring-line backdrop-blur', className)}>{children}</section>
}

export function Logo({ className }: { className?: string }) {
  // Basketball seams over a Poké Ball split.
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="ballTop" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ef4444" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="29" fill="url(#ballTop)" />
      <path d="M3 32a29 29 0 0 0 58 0z" fill="#f8fafc" />
      <circle cx="32" cy="32" r="29" fill="none" stroke="#0b1020" strokeWidth="4" />
      <path d="M3 32h58" stroke="#0b1020" strokeWidth="4" />
      <path d="M32 3v58M13 10c9 9 9 35 0 44M51 10c-9 9-9 35 0 44" stroke="#0b1020" strokeWidth="2.5" fill="none" opacity="0.7" />
      <circle cx="32" cy="32" r="8" fill="#f8fafc" stroke="#0b1020" strokeWidth="4" />
    </svg>
  )
}
