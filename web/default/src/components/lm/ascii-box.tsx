import { cn } from '@/lib/utils'

export function LmAsciiBox({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <pre className={cn('lm-ascii-box', className)}>{children}</pre>
}
