import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth-store'
import { Markdown } from '@/components/ui/markdown'
import { LmTopbar } from '@/components/lm/topbar'
import { LmFooter } from '@/components/lm/footer'
import {
  HeroSection,
  CapabilityMatrix,
  ModelsPreview,
  QuickstartCode,
  WhySection,
  CtaSection,
} from './components/lm-sections'
import { useHomePageContent } from './hooks'

export function Home() {
  const { t } = useTranslation()
  const { auth } = useAuthStore()
  const isAuthenticated = !!auth.user
  const { content, isLoaded, isUrl } = useHomePageContent()

  if (!isLoaded) {
    return (
      <div className="lm-shell">
        <LmTopbar />
        <main style={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center' }}>
          <div className="lm-text-muted">{t('Loading...')}</div>
        </main>
      </div>
    )
  }

  if (content) {
    return (
      <div className="lm-shell">
        <LmTopbar />
        <main style={{ overflow: 'hidden' }}>
          {isUrl ? (
            <iframe
              src={content}
              className="h-screen w-full border-none"
              title={t('Custom Home Page')}
            />
          ) : (
            <div className="lm-container" style={{ padding: '32px' }}>
              <Markdown className="custom-home-content">{content}</Markdown>
            </div>
          )}
        </main>
      </div>
    )
  }

  return (
    <div className="lm-shell">
      <LmTopbar />
      <HeroSection isAuthenticated={isAuthenticated} />
      <div className="lm-hazard-stripe" aria-hidden="true" />
      <CapabilityMatrix />
      <ModelsPreview />
      <QuickstartCode />
      <WhySection />
      <CtaSection isAuthenticated={isAuthenticated} />
      <LmFooter />
    </div>
  )
}
