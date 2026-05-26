import { Fragment } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useSystemConfig } from '@/hooks/use-system-config'
import { useStatus } from '@/hooks/use-status'

function LegalLinks() {
  const { t } = useTranslation()
  const { status } = useStatus()
  const items: { key: string; label: string; href: string }[] = []
  if (status?.user_agreement_enabled) {
    items.push({ key: 'ua', label: t('User Agreement'), href: '/user-agreement' })
  }
  if (status?.privacy_policy_enabled) {
    items.push({ key: 'pp', label: t('Privacy Policy'), href: '/privacy-policy' })
  }
  if (items.length === 0) return null
  return (
    <>
      {items.map((item, i) => (
        <Fragment key={item.key}>
          {i > 0 && <span className="lm-text-muted-2" aria-hidden="true">·</span>}
          <Link to={item.href} style={{ color: 'var(--lm-fg-soft)' }}>{item.label}</Link>
        </Fragment>
      ))}
    </>
  )
}

export function LmFooter() {
  const { t } = useTranslation()
  const { systemName, logo, logoLoaded, footerHtml } = useSystemConfig()
  const brandDisplay = systemName || 'New API'
  const currentYear = new Date().getFullYear()

  /* ── Backend-configured custom footer HTML ── */
  if (footerHtml) {
    return (
      <footer className="lm-footer">
        <div className="lm-container">
          <div className="lm-between lm-wrap" style={{ gap: 16 }}>
            <div
              className="custom-footer"
              style={{ fontSize: '12.5px', color: 'var(--muted-foreground)' }}
              dangerouslySetInnerHTML={{ __html: footerHtml }}
            />
            <div className="lm-row lm-wrap" style={{ gap: 8, fontSize: '11px', color: 'var(--lm-muted-2)' }}>
              <LegalLinks />
              <span>© {currentYear} {brandDisplay}</span>
            </div>
          </div>
        </div>
      </footer>
    )
  }

  /* ── Default structured footer ── */
  return (
    <footer className="lm-footer">
      <div className="lm-container">
        <div className="lm-footer-grid">
          {/* Brand column */}
          <div>
            <div className="lm-brand" style={{ marginBottom: 14 }}>
              {logo && logoLoaded ? (
                <img src={logo} alt={brandDisplay} style={{ height: 26, width: 'auto', borderRadius: 3 }} />
              ) : (
                <span className="lm-brand-mark">{brandDisplay.charAt(0).toUpperCase()}</span>
              )}
              <span className="lm-brand-name">{brandDisplay}</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', lineHeight: 1.7, maxWidth: '28ch' }}>
              {t('Powerful API Management Platform')}
            </p>
          </div>

          {/* Product links */}
          <div>
            <h4>{t('Product')}</h4>
            <ul>
              <li><Link to="/pricing">{t('Model Square')}</Link></li>
              <li><Link to="/rankings">{t('Rankings')}</Link></li>
              <li><Link to="/dashboard">{t('Console')}</Link></li>
            </ul>
          </div>

        </div>

        <div className="lm-footer-bottom">
          <div className="lm-row lm-wrap" style={{ gap: 8 }}>
            <span>© {currentYear} {brandDisplay}</span>
            <LegalLinks />
          </div>
          <span>
            <a href="https://github.com/QuantumNous/new-api" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--lm-fg-soft)' }}>
              {t('New API')}
            </a>
          </span>
        </div>
      </div>
    </footer>
  )
}
