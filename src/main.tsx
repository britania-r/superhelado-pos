// src/main.tsx

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import './styles/_variables.css';
import './styles/global.css';
import App from './App.tsx';
// Escucha el aviso de instalación desde el inicio (puede llegar antes que el banner)
import './pwa/installPrompt';
import { registerServiceWorker } from './pwa/registerServiceWorker';

registerServiceWorker();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);