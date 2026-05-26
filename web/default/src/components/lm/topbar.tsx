import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useTopNavLinks, type TopNavLink } from '@/hooks/use-top-nav-links'
import { useNotifications } from '@/hooks/use-notifications'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeSwitch } from '@/components/theme-switch'
import { NotificationPopover } from '@/components/notification-popover'
import { ProfileDropdown } from '@/components/profile-dropdown'

const AUTH_PROMPT_SECONDS = 5

type AuthPromptTarget = { title: string; href: string }

export function LmTopbar({
  showThemeSwitch = true,
  showLanguageSwitcher = true,
  showNotifications = true,
  showAuthButtons = true,
}: {
  showThemeSwitch?: boolean
  showLanguageSwitcher?: boolean
  showNotifications?: boolean
  showAuthButtons?: boolean
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [shrunk, setShrunk] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [authPromptTarget, setAuthPromptTarget] = useState<AuthPromptTarget | null>(null)
  const [authPromptSecondsLeft, setAuthPromptSecondsLeft] = useState(AUTH_PROMPT_SECONDS)
  const router = useRouterState()
  const currentPath = router.location.pathname
  const user = useAuthStore((s) => s.auth.user)

  const dynamicLinks = useTopNavLinks()
  const { systemName, logo, logoLoaded } = useSystemConfig()
  const {
    notice,
    announcements,
    loading: notifLoading,
    unreadCount,
    popoverOpen,
    setPopoverOpen,
    activeTab,
    setActiveTab,
  } = useNotifications()
  const { status } = useStatus()
  const showSignUp = !status?.self_use_mode_enabled && status?.register_enabled !== false

  /* ── scroll shrink ── */
  useEffect(() => {
    const onScroll = () => setShrunk(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* ── drawer escape ── */
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerOpen, closeDrawer])

  /* ── auth prompt countdown & redirect ── */
  useEffect(() => {
    if (!authPromptTarget) return
    const intervalId = window.setInterval(() => {
      setAuthPromptSecondsLeft((s) => Math.max(s - 1, 0))
    }, 1000)
    const timeoutId = window.setTimeout(() => {
      const redirect = authPromptTarget.href
      setAuthPromptTarget(null)
      navigate({ to: '/sign-in', search: { redirect } })
    }, AUTH_PROMPT_SECONDS * 1000)
    return () => { window.clearInterval(intervalId); window.clearTimeout(timeoutId) }
  }, [authPromptTarget, navigate])

  const closeAuthPrompt = useCallback(() => {
    setAuthPromptTarget(null)
    setAuthPromptSecondsLeft(AUTH_PROMPT_SECONDS)
  }, [])

  const navigateToSignIn = useCallback(() => {
    const redirect = authPromptTarget?.href || '/'
    setAuthPromptTarget(null)
    navigate({ to: '/sign-in', search: { redirect } })
  }, [authPromptTarget?.href, navigate])

  /* ── nav link click handler (disabled / requiresAuth) ── */
  const handleNavLinkClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, link: TopNavLink, closeMobile = false) => {
      if (link.disabled) { event.preventDefault(); return }
      if (link.requiresAuth) {
        event.preventDefault()
        if (closeMobile) setDrawerOpen(false)
        setAuthPromptSecondsLeft(AUTH_PROMPT_SECONDS)
        setAuthPromptTarget({ title: t(link.title), href: link.href })
        return
      }
      if (closeMobile) setDrawerOpen(false)
    },
    [t],
  )

  const brandDisplay = systemName || 'QuantumNous'

  return (
    <>
      <div className={cn('lm-topbar-wrap', shrunk && 'is-shrunk')}>
        <div className="lm-container">
          <div className="lm-topbar">
            <Link to="/" className="lm-brand" aria-label={brandDisplay}>
              {logo && logoLoaded ? (
                <img src={logo} alt={brandDisplay} style={{ height: 26, width: 'auto', borderRadius: 3 }} />
              ) : (
                <span className="lm-brand-mark">{brandDisplay.charAt(0).toUpperCase()}</span>
              )}
              <span className="lm-brand-name">{brandDisplay}</span>
            </Link>

            {/* ── Desktop nav ── */}
            <nav className="lm-topnav" aria-label={t('Main navigation')}>
              {dynamicLinks.map((link) =>
                link.external ? (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-disabled={link.disabled}
                    tabIndex={link.disabled ? -1 : undefined}
                    onClick={(e) => handleNavLinkClick(e, link)}
                    className={cn(link.disabled && 'pointer-events-none opacity-50')}
                  >
                    {t(link.title)}
                  </a>
                ) : (
                  <Link
                    key={link.href}
                    to={link.href}
                    disabled={link.disabled}
                    onClick={(e) => handleNavLinkClick(e, link)}
                    className={cn(
                      currentPath === link.href && 'is-active',
                      link.disabled && 'pointer-events-none opacity-50',
                    )}
                  >
                    {t(link.title)}
                  </Link>
                ),
              )}
            </nav>

            <div style={{ flex: 1 }} />

            <div className="lm-row" style={{ gap: 4 }}>
              {showLanguageSwitcher && <LanguageSwitcher />}
              {showThemeSwitch && <ThemeSwitch />}
              {showNotifications && (
                <NotificationPopover
                  open={popoverOpen}
                  onOpenChange={setPopoverOpen}
                  unreadCount={unreadCount}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  notice={notice}
                  announcements={announcements}
                  loading={notifLoading}
                />
              )}
              {user ? (
                <ProfileDropdown />
              ) : (
                showAuthButtons && (
                  <>
                    <Link to="/sign-in" className="lm-btn lm-btn-ghost">{t('Sign in')}</Link>
                    {showSignUp && <Link to="/sign-up" className="lm-btn lm-btn-primary">{t('Sign up')} →</Link>}
                  </>
                )
              )}
              <button className="lm-hamburger" aria-label={t('Menu')} type="button" onClick={() => setDrawerOpen(true)}>
                <span /><span /><span />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      <aside className={cn('lm-drawer', drawerOpen && 'is-open')} aria-hidden={!drawerOpen}>
        <button className="lm-drawer-close" aria-label={t('Close menu')} type="button" onClick={closeDrawer}>×</button>
        {dynamicLinks.map((link) =>
          link.external ? (
            <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" onClick={(e) => handleNavLinkClick(e, link, true)}>
              {t(link.title)}
            </a>
          ) : (
            <Link key={link.href} to={link.href} onClick={(e) => handleNavLinkClick(e, link, true)}>
              {t(link.title)}
            </Link>
          ),
        )}
        <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
          {user ? (
            <Link to="/dashboard" className="lm-btn lm-btn-primary" style={{ flex: 1 }} onClick={closeDrawer}>
              {t('Console')}
            </Link>
          ) : (
            showAuthButtons && (
              <>
                <Link to="/sign-in" className="lm-btn" style={{ flex: 1 }} onClick={closeDrawer}>{t('Sign in')}</Link>
                {showSignUp && <Link to="/sign-up" className="lm-btn lm-btn-primary" style={{ flex: 1 }} onClick={closeDrawer}>{t('Sign up')}</Link>}
              </>
            )
          )}
        </div>
      </aside>

      {/* ── Auth-required prompt dialog ── */}
      <Dialog open={!!authPromptTarget} onOpenChange={(open) => { if (!open) closeAuthPrompt() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Sign in required')}</DialogTitle>
            <DialogDescription>
              {t('Please sign in to view {{module}}.', { module: authPromptTarget?.title || '' })}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/40 text-muted-foreground rounded-lg px-3 py-2 text-sm">
            {t('Redirecting to sign in in {{seconds}} seconds.', { seconds: authPromptSecondsLeft })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAuthPrompt}>{t('Cancel')}</Button>
            <Button onClick={navigateToSignIn}>{t('Sign in now')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
