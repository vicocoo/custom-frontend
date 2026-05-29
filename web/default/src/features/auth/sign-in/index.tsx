import { Link, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { LmAuthLayout } from '@/components/lm/auth-layout'
import { LmFrame } from '@/components/lm/frame'
import { TermsFooter } from '../components/terms-footer'
import { UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  const { t } = useTranslation()
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })
  const { status } = useStatus()
  const { systemName } = useSystemConfig()
  const brand = systemName || 'New API'

  return (
    <LmAuthLayout
      asidePosition="right"
      eyebrow={`0x01 · ${t('Sign in').toUpperCase()}`}
      heading={t('Welcome back')}
      asideTag="// AUTH GATE"
      asideSector="SECTOR-A"
      asideContent={
        <LmFrame corners style={{ padding: '28px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: 'var(--foreground)' }}>
            {brand.toUpperCase()}
          </div>
          <div style={{
            borderTop: '1px dashed var(--border)',
            margin: '12px 0',
          }} />
          <div style={{ fontSize: 13, color: 'var(--lm-fg-soft)', letterSpacing: '0.1em' }}>
            AUTH MODULE
          </div>
        </LmFrame>
      }
    >
      <div style={{ marginBottom: 8 }}>
        {!status?.self_use_mode_enabled &&
          status?.register_enabled !== false && (
            <p style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
              {t("Don't have an account?")}{' '}
              <Link
                to="/sign-up"
                style={{ color: 'var(--lm-accent)', textDecoration: 'underline' }}
              >
                {t('Sign up')}
              </Link>
            </p>
          )}
      </div>

      <UserAuthForm redirectTo={redirect} />

      <TermsFooter variant="sign-in" status={status} className="text-center" />
    </LmAuthLayout>
  )
}
