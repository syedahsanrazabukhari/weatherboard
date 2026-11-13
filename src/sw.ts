/// <reference lib="webworker" />

import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { clientsClaim } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import {
  getLastNotifiedDate,
  getReminderSettings,
  setLastNotifiedDate,
} from './lib/reminderStore'
import {
  fetchReminderWeather,
  formatReminderNotification,
  getTodayLocalDateString,
  isTimeAtOrAfter,
} from './lib/weatherReminderNotification'

declare const self: ServiceWorkerGlobalScope

// Immediately activate service worker and claim open clients
self.skipWaiting()
clientsClaim()

// 1. App Shell Precaching
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// 2. Navigation fallback for single-page application offline routing
try {
  const handler = createHandlerBoundToURL('/index.html')
  const navigationRoute = new NavigationRoute(handler, {
    denylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
  })
  registerRoute(navigationRoute)
} catch (error) {
  console.warn('[Service Worker] Failed to register navigation route fallback:', error)
}

// 3. Runtime caching for weather data ONLY
// Intercepts requests to api.openweathermap.org and api.open-meteo.com
// Uses NetworkFirst with 8-second timeout, cached in 'weatherboard-weather-v1'
// maxEntries: 4 ensures only the most recent city's data stays cached
// Status 200 responses only. GeoDB autocomplete requests are NOT cached.
registerRoute(
  ({ url }) =>
    url.hostname === 'api.openweathermap.org' ||
    url.hostname === 'api.open-meteo.com',
  new NetworkFirst({
    cacheName: 'weatherboard-weather-v1',
    networkTimeoutSeconds: 8,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200],
      }),
      new ExpirationPlugin({
        maxEntries: 4,
        purgeOnQuotaError: true,
      }),
    ],
  })
)

// 4. Notification Click: closes notification and focuses open client or opens target URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing app window if available
        for (const client of clientList) {
          if ('focus' in client && typeof client.focus === 'function') {
            return client.focus()
          }
        }
        // Otherwise open a new window at targetUrl
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl)
        }
      })
      .catch((err) => {
        console.warn('[WeatherBoard SW] Error handling notificationclick:', err)
      })
  )
})

// 5. Periodic Background Sync for Daily Weather Reminder
// LIMITATION NOTE:
// True Web Push at an exact minute requires a backend push server (Web Push via VAPID/FCM).
// In a client-side-only PWA, Periodic Background Sync is Chromium-only (Chrome/Edge on
// desktop and Android), requires the PWA to be installed, and browser heuristics decide
// the actual execution window based on user engagement, network, and battery optimization.
async function handleDailyWeatherPeriodicSync(): Promise<void> {
  try {
    const settings = await getReminderSettings()
    if (!settings || !settings.enabled) {
      return
    }

    const todayStr = getTodayLocalDateString()
    const lastNotified = await getLastNotifiedDate()

    if (lastNotified === todayStr) {
      // Already notified today
      return
    }

    if (!isTimeAtOrAfter(settings.time)) {
      // Current time is before the scheduled reminder time
      return
    }

    // Try Open-Meteo first (no API key, fast) with the stored lat/lon
    const weatherData = await fetchReminderWeather(settings.lat, settings.lon)
    const { title, body } = formatReminderNotification(settings.cityName, weatherData)

    await self.registration.showNotification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: 'weatherboard-reminder',
      data: {
        url: '/',
      },
    })

    // Record notification date so we only notify once per calendar day
    await setLastNotifiedDate(todayStr)
  } catch (error) {
    console.warn('[SW PeriodicSync] Failed to process daily weather sync:', error)
  }
}

self.addEventListener('periodicsync', (event: any) => {
  if (event.tag === 'daily-weather') {
    event.waitUntil(handleDailyWeatherPeriodicSync())
  }
})

// Push event placeholder
self.addEventListener('push', (event) => {
  console.log('[WeatherBoard SW] Push event received:', event)
})
