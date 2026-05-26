import { LmTopbar } from '@/components/lm/topbar'
import { LmFooter } from '@/components/lm/footer'

type PublicLayoutProps = {
  children: React.ReactNode
  showMainContainer?: boolean
  showFooter?: boolean
  /** Pass through to LmTopbar */
  showThemeSwitch?: boolean
  showLanguageSwitcher?: boolean
  showNotifications?: boolean
  showAuthButtons?: boolean
}

export function PublicLayout({
  children,
  showMainContainer,
  showFooter,
  showThemeSwitch,
  showLanguageSwitcher,
  showNotifications,
  showAuthButtons,
}: PublicLayoutProps) {
  return (
    <div className="lm-shell">
      <LmTopbar
        showThemeSwitch={showThemeSwitch}
        showLanguageSwitcher={showLanguageSwitcher}
        showNotifications={showNotifications}
        showAuthButtons={showAuthButtons}
      />

      {showMainContainer !== false ? (
        <main className="lm-container" style={{ paddingTop: 24, paddingBottom: 48 }}>
          {children}
        </main>
      ) : (
        children
      )}

      {showFooter !== false && <LmFooter />}
    </div>
  )
}
