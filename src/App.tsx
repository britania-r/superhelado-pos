// src/App.tsx

import { useEffect } from 'react';
import { AppRouter } from './router/AppRouter';
import { supabase } from './config/supabaseClient';
import { useUserStore } from './store/userStore';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { getProfile } from './api/profiles.api';
import { Toaster } from 'react-hot-toast';

/* Todos los avisos duran 1.3 s */
const TOAST_DURATION_MS = 1300;

function App() {
  const { setUserAndProfile, setIsLoading } = useUserStore();

  useEffect(() => {
    const handleAuthChange = async (session: Session | null) => {
      if (session?.user) {
        const profile = await getProfile(session.user.id);
        setUserAndProfile(session.user, profile);
      } else {
        setUserAndProfile(null, null);
      }
      setIsLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        handleAuthChange(session);
      }
    );

    return () => subscription.unsubscribe();
  }, [setUserAndProfile, setIsLoading]);

  return (
    <>
      <AppRouter />
      <Toaster
        position="top-right"
        gutter={8}
        toastOptions={{
          duration: TOAST_DURATION_MS,
          style: {
            maxWidth: 380,
            padding: '10px 14px',
            borderRadius: '12px',
            background: '#232A5C',
            color: '#FFFFFF',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            fontWeight: 500,
            lineHeight: 1.4,
            boxShadow: '0 12px 32px -10px rgba(35, 42, 92, 0.45)',
          },
          success: {
            duration: TOAST_DURATION_MS,
            iconTheme: { primary: '#6FD3A1', secondary: '#232A5C' },
          },
          error: {
            duration: TOAST_DURATION_MS,
            iconTheme: { primary: '#FF8A9B', secondary: '#232A5C' },
          },
        }}
      />
    </>
  );
}

export default App;