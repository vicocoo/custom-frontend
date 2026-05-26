import { cn } from '@/lib/utils'

export type LmTagVariant = 'default' | 'accent' | 'amber' | 'cyan' | 'rose' | 'magenta' | 'solid'

const variantMap = {
  default: '',
  accent: 'is-accent',
  amber: 'is-amber',
  cyan: 'is-cyan',
  rose: 'is-rose',
  magenta: 'is-magenta',
  solid: 'solid',
} as const

export function LmTag({
  variant = 'default',
  className,
  children,
}: {
  variant?: keyof typeof variantMap
  className?: string
  children: React.ReactNode
}) {
  return (
    <span className={cn('lm-tag', variantMap[variant], className)}>
      {children}
    </span>
  )
}
