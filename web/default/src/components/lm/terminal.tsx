import { cn } from '@/lib/utils'

export interface TerminalLine {
  type?: 'prompt' | 'output' | 'comment' | 'blank'
  text?: string
  html?: string
  parts?: Array<{ text: string; cls?: string }>
}

export function LmTerminal({
  title,
  meta,
  children,
  className,
  minHeight,
}: {
  title?: React.ReactNode
  meta?: React.ReactNode
  children: React.ReactNode
  className?: string
  minHeight?: string
}) {
  return (
    <div className={cn('lm-terminal', className)}>
      <div className="lm-terminal-bar">
        <div className="dots">
          <i />
          <i />
          <i />
        </div>
        {title && <span className="term-title">{title}</span>}
        {meta && <span className="term-meta">{meta}</span>}
      </div>
      <div className="lm-terminal-body" style={minHeight ? { minHeight } : undefined}>
        {children}
      </div>
    </div>
  )
}

export function TermLine({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <span className={cn('lm-term-line', className)}>{children}</span>
}
