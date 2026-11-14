
/// <reference lib="webworker" />

import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { clientsClaim } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import {
  NavigationRoute,
  registerRoute,
} from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'

import {
  getReminderLastNotifiedDate,
  getReminderSettings,
  setReminderLastNotifiedDate,
} from './lib/reminderStore'

import {
  fetchReminderWeather,
  formatReminderNotification,
  getTodayLocalDateString,
  isReminderDue,
} from './lib/weatherReminderNotification'

declare const self: ServiceWorkerGlobalScope

// Activate the new service worker.
self.skipWaiting()
clientsClaim()

// 1. App shell precaching.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// 2. SPA navigation fallback.
try {
  const handler = createHandlerBoundToURL('/index.html')

  const navigationRoute = new NavigationRoute(handler, {
    denylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
  })

  registerRoute(navigationRoute)
} catch (error) {
  console.warn(
    '[Service Worker] Navigation route registration failed:',
    error
  )
}

// 3. Weather API caching.
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

// 4. Notification clicks.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((clientList) => {
        for (const client of clientList) {
          if (
            'focus' in client &&
            typeof client.focus === 'function'
          ) {
            return client.focus()
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl)
        }

        return undefined
      })
      .catch((error) => {
        console.warn(
          '[WeatherBoard SW] Notification click failed:',
          error
        )
      })
  )
})

// 5. Multiple reminder background processing.
//
// Important: Periodic Background Sync is best effort.
// It does not guarantee execution at an exact minute.

async function handleDailyWeatherPeriodicSync(): Promise<void> {
  try {
    const reminders = await getReminderSettings()
    const today = getTodayLocalDateString()

    const activeReminders = reminders.filter(
      (reminder) =>
        reminder.enabled &&
        reminder.days.length > 0
    )

    for (const reminder of activeReminders) {
      try {
        // Skip if today is not a selected weekday or time is not reached.
        if (!isReminderDue(reminder.time, reminder.days)) {
          continue
        }

        // Check this reminder's individual notification history.
        const lastNotified = await getReminderLastNotifiedDate(
          reminder.id
        )

        if (lastNotified === today) {
          continue
        }

        const weatherData = await fetchReminderWeather(
          reminder.lat,
          reminder.lon
        )

        const { title, body } = formatReminderNotification(
          reminder.cityName,
          weatherData,
          reminder.unit ?? 'c'
        )

        await self.registration.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',

          // Different tag for every reminder.
          tag: `weatherboard-reminder-${reminder.id}`,

          data: {
            url: '/',
          },
        })

        // Save history independently for this reminder.
        await setReminderLastNotifiedDate(
          reminder.id,
          today
        )
      } catch (error) {
        console.warn(
          `[SW] Failed to process reminder ${reminder.id}:`,
          error
        )
      }
    }
  } catch (error) {
    console.warn(
      '[SW PeriodicSync] Reminder processing failed:',
      error
    )
  }
}

// 6. Periodic background sync listener.
self.addEventListener('periodicsync', (event: any) => {
  if (event.tag === 'daily-weather') {
    event.waitUntil(
      handleDailyWeatherPeriodicSync()
    )
  }
})

// 7. Push event placeholder.
self.addEventListener('push', (event) => {
  console.log('[WeatherBoard SW] Push event received:', event)
})
