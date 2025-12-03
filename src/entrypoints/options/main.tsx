import '@/assets/tailwind.css';
import { ThemeProvider } from '@/providers/ThemeProvider.tsx';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { HashRouter } from 'react-router-dom';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <HashRouter>
        <App />
      </HashRouter>
      <LicenseModal />
    </ThemeProvider>
  </StrictMode>,
);
