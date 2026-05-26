import { Link, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { LmAuthLayout } from '@/components/lm/auth-layout'
import { LmAsciiBox } from '@/components/lm/ascii-box'
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
        <LmAsciiBox>
{`┌───────────────────────────┐
│                           │
│   ${brand.toUpperCase().padEnd(23, ' ')} │
│   ─────────────────────   │
│   AUTH  MODULE            │
│                           │
└───────────────────────────┘`}
        </LmAsciiBox>
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
