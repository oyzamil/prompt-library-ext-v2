import { ThemeProvider } from '@/providers/ThemeProvider.tsx';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { HashRouter, Router } from 'react-router-dom';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ProtectedRoute>
        <HashRouter>
          <App />
        </HashRouter>
        <LicenseModal />
      </ProtectedRoute>
    </ThemeProvider>
  </StrictMode>,
);
