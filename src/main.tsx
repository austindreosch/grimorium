import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nProvider } from './lib/i18n'
import './index.css'
import App from './App.tsx'
import { initSync } from './lib/sync'

// Cloud backup: pull remote → merge into local, then flush pending writes.
// No-op unless VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set.
initSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)
