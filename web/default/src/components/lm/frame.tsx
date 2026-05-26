import { cn } from '@/lib/utils'

export function LmFrame({
  corners = false,
  className,
  style,
  children,
}: {
  corners?: boolean
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <div className={cn('lm-frame', className)} style={style}>
      {corners && (
        <>
          <span className="lm-frame-corner tl">&#x250C;</span>
          <span className="lm-frame-corner tr">&#x2510;</span>
          <span className="lm-frame-corner bl">&#x2514;</span>
          <span className="lm-frame-corner br">&#x2518;</span>
        </>
      )}
      {children}
    </div>
  )
}
