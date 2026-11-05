import React, { useState, useEffect } from 'react';
import { ToastProvider, useToast } from './components/common/Toast';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { LanguageToggle } from './components/common/LanguageToggle';
import { InvitePage } from './components/section1/InvitePage';
import { RegisterPage } from './components/section1/RegisterPage';
import { SubscribersPage } from './components/section1/SubscribersPage';
import { LoginPage } from './components/section1/LoginPage';
import { JoinPage } from './components/section2/JoinPage';
import { PermissionsMatrixPage } from './components/section2/PermissionsMatrixPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { db } from './services/db';
import { ShieldCheck, Sliders } from 'lucide-react';

type PageRoute = 'invite' | 'register' | 'subscribers' | 'login' | 'join' | 'permissions';

// Pure helper function: Extract slug from URL without triggering React state updates during render
function getSlugFromUrl(): string {
  if (typeof window === 'undefined') return 'noor';
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();

  const matchPath = path.match(/join\/([^/?#]+)/);
  if (matchPath && matchPath[1]) return decodeURIComponent(matchPath[1]);

  const matchHash = hash.match(/join\/([^/?#]+)/);
  if (matchHash && matchHash[1]) return decodeURIComponent(matchHash[1]);

  try {
    const saved = sessionStorage.getItem('noor_last_slug');
    if (saved) return saved;
  } catch {}

  return 'noor';
}

// Pure helper function: Extract page route from URL
function getRouteFromUrl(): PageRoute {
  if (typeof window === 'undefined') return 'join';
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();

  if (path.includes('permissions') || hash.includes('permissions')) return 'permissions';
  if (path.includes('join') || hash.includes('join')) return 'join';
  if (path.includes('subscribers') || hash.includes('subscribers')) return 'subscribers';
  if (path.includes('register') || hash.includes('register')) return 'register';
  if (path.includes('login') || hash.includes('login')) return 'login';
  if (path.includes('invite') || hash.includes('invite')) return 'invite';

  try {
    const last = sessionStorage.getItem('noor_last_route') as PageRoute;
    if (last && ['invite', 'register', 'subscribers', 'login', 'join', 'permissions'].includes(last)) {
      return last;
    }
  } catch {}

  return 'join';
}

function AppContent() {
  const { showToast } = useToast();
  const { t, isRtl, language } = useLanguage();

  // Pure initial state initialization (no setState in render phase)
  const [activeStoreSlug, setActiveStoreSlug] = useState<string>(getSlugFromUrl);
  const [currentRoute, setCurrentRoute] = useState<PageRoute>(getRouteFromUrl);
  const [loginMessage, setLoginMessage] = useState<string | undefined>();
  const [session, setSession] = useState(db.getCurrentSession());

  // Listen to browser popstate and hashchange for clean URL navigation
  useEffect(() => {
    const handlePopState = () => {
      const r = getRouteFromUrl();
      const s = getSlugFromUrl();
      setCurrentRoute(r);
      setActiveStoreSlug(s);
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  // Golden Rule 8 & Section 1.3 Protection: Super Owner only
  useEffect(() => {
    if (currentRoute === 'subscribers') {
      const activeSession = db.getCurrentSession();
      if (!activeSession.isLoggedIn || !activeSession.isSuperOwner) {
        showToast(
          language === 'ar'
            ? 'هذه الصفحة خاصة بالسوبر مالك فقط! تم التحويل لصفحة تسجيل الدخول'
            : 'This page is strictly reserved for Super Owner! Redirecting to login',
          'danger'
        );
        setCurrentRoute('login');
        setLoginMessage(
          language === 'ar'
            ? 'يرجى تسجيل الدخول بحساب السوبر مالك للوصول لهذه الصفحة'
            : 'Please log in with Super Owner credentials to access this page'
        );
      }
    }
  }, [currentRoute, showToast, language]);

  const navigateTo = (route: PageRoute, msg?: string, slug?: string) => {
    const resolvedSlug = slug || activeStoreSlug || 'noor';
    if (slug) {
      setActiveStoreSlug(slug);
    }
    setCurrentRoute(route);
    setLoginMessage(msg);

    try {
      sessionStorage.setItem('noor_last_route', route);
      if (route === 'join') {
        sessionStorage.setItem('noor_last_slug', resolvedSlug);
      }
    } catch {}

    const targetPath =
      route === 'invite'
        ? '/invite/NOOR'
        : route === 'register'
        ? '/register.html'
        : route === 'subscribers'
        ? '/subscribers.html'
        : route === 'join'
        ? `/join/${resolvedSlug}`
        : route === 'permissions'
        ? '/permissions.html'
        : '/login.html';
    try {
      window.history.pushState(null, '', targetPath);
    } catch {
      window.location.hash = route === 'join' ? `join/${resolvedSlug}` : route;
    }
  };

  const handleLoginSuccess = (newSession: any) => {
    setSession(newSession);
    if (newSession.isSuperOwner) {
      navigateTo('subscribers');
    } else {
      showToast(
        language === 'ar'
          ? `تم تسجيل الدخول بنجاح لمتجر ${newSession.storeName || ''}`
          : `Successfully logged in to store ${newSession.storeName || ''}`,
        'success'
      );
      navigateTo('permissions');
    }
  };

  const handleLogout = () => {
    db.clearSession();
    setSession({ isLoggedIn: false, isSuperOwner: false });
    showToast(
      language === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Successfully logged out',
      'info'
    );
    navigateTo('login');
  };

  return (
    <div className="relative min-h-screen bg-[#0A0A0A] text-white" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Direct Navigation Bar: With [ عربي | English ] at the beginning before logo */}
      <nav className="no-print bg-[#111111]/90 backdrop-blur-md border-b border-[#2A2A2A] sticky top-0 z-40 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          {/* زر في بداية الصفحة، في أول شريط فوق، قبل الشعار، في كل الصفحات، حتى قبل تسجيل الدخول: [ عربي | English ] */}
          <LanguageToggle />

          <div className="flex items-center gap-1.5 font-bold">
            <span className="font-black text-[#D4AF37] text-sm tracking-wider">NOOR</span>
            <span className="text-[#A0A0A0]">|</span>
            <span className="text-white text-xs hidden sm:inline">{t('sectionsLabel')}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {/* 1.1 invite/NOOR */}
          <button
            onClick={() => navigateTo('invite')}
            className={`py-1.5 px-2.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              currentRoute === 'invite'
                ? 'bg-[#D4AF37] text-[#0A0A0A] font-bold'
                : 'bg-[#1A1A1A] hover:bg-[#222222] text-[#A0A0A0] hover:text-white'
            }`}
          >
            {t('navInvite')}
          </button>

          {/* 1.2 register.html */}
          <button
            onClick={() => navigateTo('register')}
            className={`py-1.5 px-2.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              currentRoute === 'register'
                ? 'bg-[#D4AF37] text-[#0A0A0A] font-bold'
                : 'bg-[#1A1A1A] hover:bg-[#222222] text-[#A0A0A0] hover:text-white'
            }`}
          >
            {t('navRegister')}
          </button>

          {/* 1.3 subscribers.html */}
          <button
            onClick={() => navigateTo('subscribers')}
            className={`py-1.5 px-2.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
              currentRoute === 'subscribers'
                ? 'bg-[#D4AF37] text-[#0A0A0A] font-bold'
                : 'bg-[#1A1A1A] hover:bg-[#222222] text-[#A0A0A0] hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>{t('navSubscribers')}</span>
          </button>

          {/* 2.1 join/<STORE_SLUG> */}
          <button
            onClick={() => navigateTo('join')}
            className={`py-1.5 px-2.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              currentRoute === 'join'
                ? 'bg-[#D4AF37] text-[#0A0A0A] font-bold'
                : 'bg-[#1A1A1A] hover:bg-[#222222] text-[#A0A0A0] hover:text-white'
            }`}
          >
            {t('navJoin')}
          </button>

          {/* 2.3 ميزان الصلاحيات */}
          <button
            onClick={() => navigateTo('permissions')}
            className={`py-1.5 px-2.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
              currentRoute === 'permissions'
                ? 'bg-[#D4AF37] text-[#0A0A0A] font-bold'
                : 'bg-[#1A1A1A] hover:bg-[#222222] text-[#A0A0A0] hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>{t('navPermissions')}</span>
          </button>

          {/* login.html */}
          <button
            onClick={() => navigateTo('login')}
            className={`py-1.5 px-2.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              currentRoute === 'login'
                ? 'bg-[#D4AF37] text-[#0A0A0A] font-bold'
                : 'bg-[#1A1A1A] hover:bg-[#222222] text-[#A0A0A0] hover:text-white'
            }`}
          >
            {t('navLogin')}
          </button>
        </div>
      </nav>

      {/* Dynamic Page Router */}
      {currentRoute === 'invite' && (
        <InvitePage onNavigateToRegister={() => navigateTo('register')} />
      )}

      {currentRoute === 'register' && (
        <RegisterPage
          onNavigateToLogin={(msg) => navigateTo('login', msg)}
          onNavigateToForgotPassword={() => navigateTo('login')}
          onNavigateToInvite={() => navigateTo('invite')}
        />
      )}

      {currentRoute === 'subscribers' && (
        <SubscribersPage
          onLogout={handleLogout}
          onNavigateToLogin={() => navigateTo('login')}
          onNavigateToInvite={() => navigateTo('invite')}
        />
      )}

      {currentRoute === 'join' && (
        <JoinPage
          storeSlug={activeStoreSlug}
          onNavigateToRegister={() => navigateTo('register')}
          onNavigateToLogin={(msg) => navigateTo('login', msg)}
          onNavigateToForgotPassword={() => navigateTo('login')}
        />
      )}

      {currentRoute === 'permissions' && (
        <PermissionsMatrixPage
          currentTenantId={session.tenantId}
          onLogout={handleLogout}
          onNavigateToJoin={(slug) => navigateTo('join', undefined, slug)}
          onNavigateToInvite={() => navigateTo('invite')}
        />
      )}

      {currentRoute === 'login' && (
        <LoginPage
          initialMessage={loginMessage}
          onLoginSuccess={handleLoginSuccess}
          onNavigateToRegister={() => navigateTo('register')}
          onNavigateToInvite={() => navigateTo('invite')}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
