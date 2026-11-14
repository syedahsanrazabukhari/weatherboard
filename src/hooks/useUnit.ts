/**
 * Temperature unit preference (°C / °F).
 *
 * A small module-level store read through useSyncExternalStore, so every
 * component using the hook updates instantly when the unit changes, without a
 * provider and without refetching weather. The choice is persisted and synced
 * across tabs. It is also copied into the reminder settings (IndexedDB) so the
 * service worker can format background notifications in the same unit.
 */
import { useSyncExternalStore } from 'react'
import { readPref, writePref } from '../lib/prefs'
import { setReminderUnit } from '../lib/reminderStore'
import { isUnit, Unit, UNIT_STORAGE_KEY } from '../lib/units'

function loadUnit(): Unit {
  const stored = readPref(UNIT_STORAGE_KEY)
  return isUnit(stored) ? stored : 'c'
}

let currentUnit: Unit = loadUnit()
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === UNIT_STORAGE_KEY && isUnit(event.newValue) && event.newValue !== currentUnit) {
      currentUnit = event.newValue
      emit()
    }
  })
}

export function getUnit(): Unit {
  return currentUnit
}

export function setUnit(next: Unit): void {
  if (next === currentUnit) return
  currentUnit = next
  writePref(UNIT_STORAGE_KEY, next)
  emit()
  void setReminderUnit(next)
}

export function useUnit(): { unit: Unit; setUnit: (next: Unit) => void } {
  const unit = useSyncExternalStore(subscribe, getUnit, getUnit)
  return { unit, setUnit }
}