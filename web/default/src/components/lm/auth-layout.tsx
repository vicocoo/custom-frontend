import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useStreamLines, type StreamLine } from './use-stream-lines'
import { LmTopbar } from './topbar'

const defaultBootLines: StreamLine[] = [
  { text: '[SYS] booting auth-gateway ...', cls: 'lm-term-out' },
  { text: '[OK]  TLS handshake ✓', cls: 'ok' },
  { text: '[OK]  session-store connected', cls: 'ok' },
  { text: '[OK]  rate-limiter armed', cls: 'ok' },
  { text: '[WARN] OAuth nonce pool: 84%', cls: 'warn' },
  { text: '[OK]  CAPTCHA relay ✓', cls: 'ok' },
  { text: '[INFO] passkey module ready', cls: 'info' },
  { text: '[OK]  2FA module READY', cls: 'ok' },
  { text: '[OK]  email transport ✓', cls: 'ok' },
  { text: '[SYS] all checks passed — OPEN', cls: 'ok' },
]

function BootLog({ lines = defaultBootLines }: { lines?: StreamLine[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useStreamLines(ref, lines, { charDelay: 8, lineDelay: 100, loop: true })
  return <div ref={ref} className="lm-boot-log" />
}

export function LmAuthLayout({
  asidePosition = 'right',
  eyebrow,
  heading,
  asideTag,
  asideSector,
  asideContent,
  bootLines,
  children,
}: {
  asidePosition?: 'left' | 'right'
  eyebrow?: string
  heading?: string
  asideTag?: string
  asideSector?: string
  asideContent?: React.ReactNode
  bootLines?: StreamLine[]
  children: React.ReactNode
}) {
  const { t } = useTranslation()

  return (
    <div className="lm-shell">
      <LmTopbar />

      <div className="lm-auth-shell">
        {/* Form side */}
        <div
          className="lm-auth-form"
          style={asidePosition === 'left' ? { order: 2 } : undefined}
        >
          {eyebrow && (
            <div className="lm-section-eyebrow" style={{ marginBottom: 8 }}>
              {eyebrow}
            </div>
          )}
          {heading && (
            <h1 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 700, marginBottom: 28, lineHeight: 1.2 }}>
              {heading}
            </h1>
          )}
          {children}
        </div>

        {/* Aside */}
        <div
          className={cn(
            'lm-auth-aside',
            asidePosition === 'left' && 'order-first',
          )}
        >
          <div className="lm-row" style={{ gap: 8 }}>
            {asideTag && <span className="lm-tag is-accent">{asideTag}</span>}
            {asideSector && <span className="lm-tag">{asideSector}</span>}
          </div>

          {asideContent}

          <BootLog lines={bootLines} />

          <div className="lm-row" style={{ gap: 16, fontSize: '11px' }}>
            <span className="lm-text-accent">● {t('Online').toUpperCase()}</span>
            <span className="lm-text-muted-2">|</span>
            <span className="lm-text-cyan">● {t('System Ready')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
