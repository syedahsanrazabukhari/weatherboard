/**
 * Periodic Background Sync Helper
 *
 * Manages registration of the 'daily-weather' periodic background sync tag.
 *
 * ARCHITECTURAL LIMITATION:
 * True Web Push at an exact minute requires a backend push server.
 * Periodic Background Sync is Chromium-only (Chrome, Edge on desktop and Android),
 * requires an installed PWA, and the browser decides the actual run time based on
 * usage frequency and battery optimization. Never claim guaranteed delivery.
 */

export const PERIODIC_SYNC_TAG = 'daily-weather'
// Minimum interval requested: 12 hours (12 * 60 * 60 * 1000 ms)
export const MIN_PERIODIC_SYNC_INTERVAL_MS = 12 * 60 * 60 * 1000

interface PeriodicSyncManager {
  register(tag: string, options?: { minInterval: number }): Promise<void>
  unregister(tag: string): Promise<void>
  getTags(): Promise<string[]>
}

interface ServiceWorkerRegistrationWithPeriodicSync extends ServiceWorkerRegistration {
  periodicSync?: PeriodicSyncManager
}

/**
 * Checks whether the Periodic Sync API is supported by the current browser.
 */
export function isPeriodicSyncSupported(): boolean {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false
  }
  return 'PeriodicSyncManager' in window || 'periodicSync' in ServiceWorkerRegistration.prototype
}

/**
 * Attempts to register the 'daily-weather' periodic sync on the active service worker.
 * Returns true if successfully registered, false if unsupported or rejected.
 */
export async function registerDailyPeriodicSync(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = (await navigator.serviceWorker.ready) as ServiceWorkerRegistrationWithPeriodicSync

    if (!registration || !registration.periodicSync) {
      return false
    }

    await registration.periodicSync.register(PERIODIC_SYNC_TAG, {
      minInterval: MIN_PERIODIC_SYNC_INTERVAL_MS,
    })
    return true
  } catch (error) {
    console.warn('[PeriodicSync] Failed to register periodic background sync:', error)
    return false
  }
}

/**
 * Unregisters the 'daily-weather' periodic sync task.
 */
export async function unregisterDailyPeriodicSync(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = (await navigator.serviceWorker.ready) as ServiceWorkerRegistrationWithPeriodicSync

    if (!registration || !registration.periodicSync) {
      return false
    }

    await registration.periodicSync.unregister(PERIODIC_SYNC_TAG)
    return true
  } catch (error) {
    console.warn('[PeriodicSync] Failed to unregister periodic background sync:', error)
    return false
  }
}

/**
 * Checks whether the 'daily-weather' periodic sync is currently registered.
 */
export async function isDailyPeriodicSyncActive(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = (await navigator.serviceWorker.ready) as ServiceWorkerRegistrationWithPeriodicSync

    if (!registration || !registration.periodicSync) {
      return false
    }

    const tags = await registration.periodicSync.getTags()
    return tags.includes(PERIODIC_SYNC_TAG)
  } catch {
    return false
  }
}
