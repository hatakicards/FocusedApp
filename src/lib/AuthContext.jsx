import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/lib/supabaseClient';
import { clearQueue } from '@/lib/syncQueue';
import { setGuestMode, isGuestFlagSet, getGuestUser, clearGuestData } from '@/lib/guestDB';
import { syncWidgetSession, clearWidgetSession } from '@/lib/nativeWidgetSync';
import { configureRevenueCat, logOutRevenueCat } from '@/lib/revenueCat';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);
  const [isGuest, setIsGuest] = useState(false);

  // Clean up old local-only mode data on mount
  useEffect(() => {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((k) => {
        if (k.startsWith('b44_data_') || k === 'b44_identity') {
          localStorage.removeItem(k);
        }
      });
    } catch (e) { /* ignore */ }
  }, []);

  const checkUserAuth = useCallback(async () => {
    try {
      const me = await base44.auth.me();
      if (me) {
        setUser(me);
        setIsAuthenticated(true);
        setAuthError(null);
      } else {
        setIsAuthenticated(false);
        setAuthError({ type: 'auth_required' });
      }
    } catch (e) {
      setIsAuthenticated(false);
      setAuthError({ type: 'auth_required' });
    } finally {
      setAuthChecked(true);
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    if (isGuestFlagSet()) {
      setGuestMode(true);
      setIsGuest(true);
      setUser(getGuestUser());
      setIsAuthenticated(true);
      setAuthError(null);
      setAuthChecked(true);
      setIsLoadingAuth(false);
      // Check for real auth in background — if a real token exists (e.g. user
      // logged in for real but guest flag wasn't cleared), switch to real user.
      base44.auth.me().then((me) => {
        if (me) {
          setGuestMode(false);
          setIsGuest(false);
          setUser(me);
        }
      }).catch(() => {});
    } else {
      checkUserAuth();
    }
  }, [checkUserAuth]);

  const checkAppState = useCallback(async () => {
    await checkUserAuth();
  }, [checkUserAuth]);

  // Intercetta il ritorno dal login Google/Apple nell'app nativa: Google e
  // Apple non permettono l'OAuth dentro la webview embedded, quindi il
  // flusso passa per forza da un browser di sistema (aperto da
  // loginWithProvider in base44Client.js) che a fine login reindirizza allo
  // scheme "focusedapp://auth-callback" invece che all'URL del sito — senza
  // questo, l'utente restava "intrappolato" nel browser esterno.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
      if (!url?.startsWith('focusedapp://auth-callback')) return;
      try {
        const code = new URL(url).searchParams.get('code');
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }
      } catch (e) {
        console.error('OAuth callback error', e);
      } finally {
        await Browser.close().catch(() => {});
        const returnTo = sessionStorage.getItem('oauth_return_to') || '/home';
        sessionStorage.removeItem('oauth_return_to');
        window.location.href = returnTo;
      }
    });
    return () => { listener.then((l) => l.remove()); };
  }, []);

  // Tiene lo storage condiviso letto dai widget nativi (Fase 2/3) allineato
  // alla sessione Supabase — SIGNED_IN/TOKEN_REFRESHED coprono sia il login
  // sia il refresh automatico periodico del token.
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        clearWidgetSession();
        logOutRevenueCat();
      } else if (session) {
        syncWidgetSession(session);
        configureRevenueCat(session.user.id);
      }
    });
    return () => listener?.subscription?.unsubscribe();
  }, []);

  const guestLogin = useCallback(() => {
    setGuestMode(true);
    setIsGuest(true);
    setUser(getGuestUser());
    setIsAuthenticated(true);
    setAuthError(null);
    setAuthChecked(true);
    setIsLoadingAuth(false);
  }, []);

  const logout = useCallback(() => {
    if (isGuest) {
      clearGuestData();
      setGuestMode(false);
      setIsGuest(false);
      setUser(null);
      setIsAuthenticated(false);
      window.location.href = '/login';
    } else {
      clearQueue();
      base44.auth.logout();
    }
  }, [isGuest]);

  const navigateToLogin = useCallback(() => {
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isGuest,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        authChecked,
        logout,
        guestLogin,
        navigateToLogin,
        checkUserAuth,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};