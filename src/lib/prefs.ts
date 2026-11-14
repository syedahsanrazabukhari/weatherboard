/**
 * Tiny preference storage used for the unit and theme settings.
 *
 * Every access is wrapped in try/catch (reading window.localStorage can throw a
 * SecurityError when site data is blocked). If storage is unavailable the value
 * is kept in memory for the current session so the toggles still work.
 */
const memory = new Map<string, string>()

export function readPref(key: string): string | null {
  try {
    const value = window.localStorage.getItem(key)
    if (value !== null) return value
  } catch {
    // storage blocked: fall through to memory
  }
  return memory.get(key) ?? null
}

export function writePref(key: string, value: string): void {
  memory.set(key, value)
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // storage blocked or full: the in-memory copy keeps the session working
  }
}