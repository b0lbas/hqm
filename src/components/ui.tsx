import React, { useEffect, useId, useRef } from 'react'

export function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled,
  className = ''
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
}) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition outline-none focus:ring-2 focus:ring-white/10 disabled:opacity-50 disabled:cursor-not-allowed'
  const styles: Record<string, string> = {
    primary: 'bg-neutral-700 text-neutral-100 hover:bg-neutral-600',
    secondary: 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700',
    ghost: 'bg-transparent text-neutral-300 hover:bg-neutral-800/70',
    danger: 'bg-neutral-600 text-neutral-100 hover:bg-neutral-500'
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  className = ''
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  className?: string
}) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      className={`w-full rounded-xl bg-neutral-800/70 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 outline-none ring-1 ring-white/5 focus:ring-2 focus:ring-white/10 ${className}`}
    />
  )
}

export function Select({
  value,
  onChange,
  options,
  className = ''
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  className?: string
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`w-full rounded-xl bg-neutral-800/70 px-3 py-2 text-sm text-neutral-100 outline-none ring-1 ring-white/5 focus:ring-2 focus:ring-white/10 ${className}`}
    >
      {options.map(o => (
        <option key={o.value} value={o.value} className="bg-neutral-900">
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Textarea({
  value,
  onChange,
  placeholder,
  rows = 6,
  className = ''
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  className?: string
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`w-full rounded-xl bg-neutral-800/70 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 outline-none ring-1 ring-white/5 focus:ring-2 focus:ring-white/10 ${className}`}
    />
  )
}

export function Card({
  children,
  className = ''
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-2xl bg-neutral-900/70 ring-1 ring-white/5 shadow-soft ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="border-b border-white/10 px-5 py-4">{children}</div>
}

export function CardBody({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-4">{children}</div>
}

export function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-neutral-800/70 px-2.5 py-1 text-xs text-neutral-200 ring-1 ring-white/5">
      {children}
    </span>
  )
}

export function Divider() {
  return <div className="h-px bg-white/5" />
}

export function Modal({
  open,
  title,
  children,
  onClose,
  footer
}: {
  open: boolean
  title: string
  children: React.ReactNode
  onClose: () => void
  footer?: React.ReactNode
}) {
  const id = useId()
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    // focus first focusable element
    const el = panelRef.current
    if (!el) return
    const focusable = el.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    focusable?.focus()
  }, [open])

  if (!open) return null

  return (
    <div
      aria-labelledby={id}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-neutral-950/80 backdrop-blur"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-neutral-900 ring-1 ring-white/10 shadow-soft"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <div id={id} className="text-base font-semibold">{title}</div>
          </div>
          <Button variant="ghost" onClick={onClose}>
            ✕
          </Button>
        </div>
        <div className="max-h-[75vh] overflow-auto px-5 py-4">{children}</div>
        {footer ? <div className="border-t border-white/10 px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  )
}

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(t)
  }, [value, delayMs])
  return debounced
}
