import { useEffect } from 'react';
import { AppRouter } from './router/AppRouter';
import { supabase } from './config/supabaseClient';
import { useUserStore } from './store/userStore';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { getProfile } from './api/profiles.api';
import { Toaster } from 'react-hot-toast'; 

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
      <Toaster position="top-right" /> 
    </>
  );
}

export default App;