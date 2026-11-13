/**
 * Notification Service Helper
 *
 * Provides safe wrappers for Web Notifications and ServiceWorker registration notifications.
 * Uses serviceWorker.ready -> registration.showNotification (NOT new Notification()).
 * Handles unsupported environments, permission queries, and user prompts safely without throwing.
 */

export type NotificationPermissionStatus = NotificationPermission | 'unsupported'

export interface ShowNotificationOptions {
  tag?: string
  url?: string
  icon?: string
  badge?: string
}

/**
 * Checks if the Notification API and Service Worker are both available in the current environment.
 */
export function isNotificationSupported(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  try {
    return 'Notification' in window && 'serviceWorker' in navigator
  } catch {
    return false
  }
}

/**
 * Returns the current notification permission state, or 'unsupported' if notifications are unavailable.
 */
export function getPermission(): NotificationPermissionStatus {
  if (!isNotificationSupported()) {
    return 'unsupported'
  }
  try {
    return Notification.permission
  } catch {
    return 'unsupported'
  }
}

/**
 * Requests notification permission from the browser.
 * Safe wrapper that never throws and returns the resulting permission status.
 */
export async function requestPermission(): Promise<NotificationPermissionStatus> {
  if (!isNotificationSupported()) {
    return 'unsupported'
  }
  try {
    const result = await Notification.requestPermission()
    return result
  } catch (error) {
    console.warn('[Notifications] Error requesting notification permission:', error)
    return getPermission()
  }
}

/**
 * Displays a weather notification via the active service worker registration.
 * Uses navigator.serviceWorker.ready -> registration.showNotification().
 * Never throws, returning false if unsupported, ungranted, or failed.
 */
export async function showWeatherNotification(
  title: string,
  body: string,
  options: ShowNotificationOptions = {}
): Promise<boolean> {
  if (!isNotificationSupported() || getPermission() !== 'granted') {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    if (!registration || typeof registration.showNotification !== 'function') {
      return false
    }

    await registration.showNotification(title, {
      body,
      icon: options.icon ?? '/pwa-192x192.png',
      badge: options.badge ?? '/pwa-192x192.png',
      tag: options.tag ?? 'weatherboard-reminder',
      data: {
        url: options.url ?? '/',
      },
    })
    return true
  } catch (error) {
    console.warn('[Notifications] Failed to display service worker notification:', error)
    return false
  }
}
