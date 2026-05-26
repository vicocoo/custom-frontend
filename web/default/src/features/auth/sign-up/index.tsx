import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useStatus } from '@/hooks/use-status'
import { LmAuthLayout } from '@/components/lm/auth-layout'
import { LmAsciiBox } from '@/components/lm/ascii-box'
import { LmFrame } from '@/components/lm/frame'
import { TermsFooter } from '../components/terms-footer'
import { SignUpForm } from './components/sign-up-form'

function WelcomeCard() {
  const { t } = useTranslation()
  return (
    <LmFrame corners style={{
      borderColor: 'var(--lm-accent)',
      background: 'oklch(86% 0.22 128 / 0.06)',
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--lm-accent)' }}>
        {t('Get Started')}
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: 'var(--lm-fg-soft)' }}>
        <li>▸ {t('Access multiple AI models')}</li>
        <li>▸ {t('Unified API endpoint')}</li>
        <li>▸ {t('Online Playground')}</li>
        <li>▸ {t('Usage analytics & key management')}</li>
      </ul>
    </LmFrame>
  )
}

export function SignUp() {
  const { t } = useTranslation()
  const { status } = useStatus()

  return (
    <LmAuthLayout
      asidePosition="left"
      eyebrow={`0x02 · ${t('Sign up').toUpperCase()}`}
      heading={t('Create an account')}
      asideTag="// REGISTER"
      asideSector="SECTOR-B"
      asideContent={
        <>
          <LmAsciiBox>
{`   ┌────────────────┐
   │ 1. ${t('Submit info').padEnd(12, ' ')}│
   └───────┬────────┘
           ▼
   ┌────────────────┐
   │ 2. ${t('Verify email').padEnd(12, ' ')}│
   └───────┬────────┘
           ▼
   ┌────────────────┐
   │ 3. ${t('Get API key').padEnd(12, ' ')} │
   └────────────────┘`}
          </LmAsciiBox>
          <WelcomeCard />
        </>
      }
    >
      <div style={{ marginBottom: 8 }}>
        <p style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
          {t('Already have an account?')}{' '}
          <Link
            to="/sign-in"
            style={{ color: 'var(--lm-accent)', textDecoration: 'underline' }}
          >
            {t('Sign in')}
          </Link>
        </p>
      </div>

      <SignUpForm />

      <TermsFooter variant="sign-up" status={status} className="text-center" />
    </LmAuthLayout>
  )
}
