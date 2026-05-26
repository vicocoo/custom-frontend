import { cn } from '@/lib/utils'

export function LmSection({
  eyebrow,
  title,
  sub,
  className,
  children,
}: {
  eyebrow?: string
  title?: string
  sub?: string
  className?: string
  children?: React.ReactNode
}) {
  return (
    <section className={cn('lm-section', className)}>
      <div className="lm-container">
        {eyebrow && <div className="lm-section-eyebrow">{eyebrow}</div>}
        {title && <h2 className="lm-section-title">{title}</h2>}
        {sub && <p className="lm-section-sub">{sub}</p>}
        {children}
      </div>
    </section>
  )
}
