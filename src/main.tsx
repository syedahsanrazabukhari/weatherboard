import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './lib/env'
import App from './App'

// Register PWA service worker only in production builds.
// In dev mode the SW is disabled (vite.config.ts devOptions.enabled: false)
// so registering it here would be a no-op at best and cause double-request
// interference at worst.
if (import.meta.env.PROD) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onRegistered(registration) {
        if (registration) {
          console.log('[WeatherBoard PWA] Service worker registered successfully.')
        }
      },
      onRegisterError(error) {
        console.warn('[WeatherBoard PWA] Service worker registration error:', error)
      },
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
