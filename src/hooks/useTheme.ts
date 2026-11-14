/**
 * Theme preference: 'system' (default, follows the OS), 'light' or 'dark'.
 *
 * The resolved theme is written to <html data-theme="...">, which switches the
 * CSS variables in index.css. While the preference is 'system' the app follows
 * live OS changes (prefers-color-scheme). The preference is persisted and
 * synced across tabs; an inline script in index.html applies it before the
 * first paint so there is no flash of the wrong theme.
 */
import { useSyncExternalStore } from 'react'
import { readPref, writePref } from '../lib/prefs'

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'weatherboard:theme:v1'
const THEME_COLORS: Record<ResolvedTheme, string> = { dark: '#050505', light: '#f4f2ee' }

interface ThemeSnapshot {
  preference: ThemePreference
  resolved: ResolvedTheme
}

function isPreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

function systemTheme(): ResolvedTheme {
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

function resolve(preference: ThemePreference): ResolvedTheme {
  return preference === 'system' ? systemTheme() : preference
}

function loadPreference(): ThemePreference {
  const stored = readPref(THEME_STORAGE_KEY)
  return isPreference(stored) ? stored : 'system'
}

function applyToDocument(resolved: ResolvedTheme): void {
  document.documentElement.dataset.theme = resolved
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_COLORS[resolved])
}

const initialPreference = typeof window !== 'undefined' ? loadPreference() : 'system'
let snapshot: ThemeSnapshot = {
  preference: initialPreference,
  resolved: typeof window !== 'undefined' ? resolve(initialPreference) : 'dark',
}
const listeners = new Set<() => void>()

function update(next: ThemeSnapshot): void {
  if (next.preference === snapshot.preference && next.resolved === snapshot.resolved) return
  snapshot = next
  applyToDocument(next.resolved)
  listeners.forEach((listener) => listener())
}

if (typeof window !== 'undefined') {
  applyToDocument(snapshot.resolved)

  try {
    const query = window.matchMedia('(prefers-color-scheme: light)')
    const onSystemChange = () => {
      if (snapshot.preference === 'system') {
        update({ preference: 'system', resolved: systemTheme() })
      }
    }
    query.addEventListener('change', onSystemChange)
  } catch {
    // matchMedia unavailable: keep the current theme
  }

  window.addEventListener('storage', (event) => {
    if (event.key === THEME_STORAGE_KEY && isPreference(event.newValue)) {
      update({ preference: event.newValue, resolved: resolve(event.newValue) })
    }
  })
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): ThemeSnapshot {
  return snapshot
}

export function setThemePreference(preference: ThemePreference): void {
  writePref(THEME_STORAGE_KEY, preference)
  update({ preference, resolved: resolve(preference) })
}

export function useTheme(): ThemeSnapshot & { setPreference: (next: ThemePreference) => void } {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return { ...current, setPreference: setThemePreference }
}