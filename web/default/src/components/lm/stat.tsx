import { cn } from '@/lib/utils'

export function LmStat({
  label,
  value,
  unit,
  delta,
  deltaDown,
  variant = 'accent',
  className,
}: {
  label: string
  value: string | number
  unit?: string
  delta?: string
  deltaDown?: boolean
  variant?: 'accent' | 'amber' | 'cyan' | 'rose'
  className?: string
}) {
  const dotColors = {
    accent: 'var(--lm-accent)',
    amber: 'var(--lm-amber)',
    cyan: 'var(--lm-cyan)',
    rose: 'var(--lm-rose)',
  }

  return (
    <div className={cn('lm-stat', className)}>
      <div className="lm-stat-label">
        <span className="dot" style={{ background: dotColors[variant] }} />
        {label}
      </div>
      <div className="lm-stat-value">
        {value}
        {unit && <span className="unit">{unit}</span>}
      </div>
      {delta && (
        <div className={cn('lm-stat-delta', deltaDown && 'down')}>
          {delta}
        </div>
      )}
    </div>
  )
}
