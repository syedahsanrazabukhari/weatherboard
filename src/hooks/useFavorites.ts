import { useCallback, useEffect, useState } from 'react'
import {
  FAVORITES_STORAGE_KEY,
  isLocalStorageAvailable,
  MAX_FAVORITES,
  readFavorites,
  writeFavorites,
} from '../lib/safeStorage'
import { City } from '../types'

export type AddFavoriteResult =
  | { ok: true }
  | { ok: false; reason: 'full' | 'duplicate' }

export interface UseFavoritesReturn {
  favorites: City[]
  isFavorite: (city: City | null) => boolean
  add: (city: City) => AddFavoriteResult
  remove: (cityId: number) => void
  storageAvailable: boolean
  isFull: boolean
}

// In-tab event listener bus so all components using useFavorites stay in sync
type ChangeListener = () => void
const changeListeners = new Set<ChangeListener>()

function notifyInTabListeners() {
  changeListeners.forEach((listener) => {
    try {
      listener()
    } catch {
      // Ignore listener error
    }
  })
}

export function useFavorites(): UseFavoritesReturn {
  const [favorites, setFavorites] = useState<City[]>(() => readFavorites())
  const [storageAvailable, setStorageAvailable] = useState<boolean>(() => isLocalStorageAvailable())

  const reload = useCallback(() => {
    setFavorites(readFavorites())
    setStorageAvailable(isLocalStorageAvailable())
  }, [])

  useEffect(() => {
    changeListeners.add(reload)

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === FAVORITES_STORAGE_KEY) {
        reload()
      }
    }

    window.addEventListener('storage', handleStorageEvent)

    return () => {
      changeListeners.delete(reload)
      window.removeEventListener('storage', handleStorageEvent)
    }
  }, [reload])

  const isFavorite = useCallback(
    (city: City | null): boolean => {
      if (!city) return false
      return favorites.some((f) => f.id === city.id)
    },
    [favorites]
  )

  const isFull = favorites.length >= MAX_FAVORITES

  const add = useCallback(
    (city: City): AddFavoriteResult => {
      const current = readFavorites()

      if (current.some((f) => f.id === city.id)) {
        return { ok: false, reason: 'duplicate' }
      }

      if (current.length >= MAX_FAVORITES) {
        return { ok: false, reason: 'full' }
      }

      const updated = [...current, city]
      const success = writeFavorites(updated)
      setStorageAvailable(success || isLocalStorageAvailable())
      setFavorites(updated)
      notifyInTabListeners()

      return { ok: true }
    },
    []
  )

  const remove = useCallback((cityId: number) => {
    const current = readFavorites()
    const updated = current.filter((f) => f.id !== cityId)
    const success = writeFavorites(updated)
    setStorageAvailable(success || isLocalStorageAvailable())
    setFavorites(updated)
    notifyInTabListeners()
  }, [])

  return {
    favorites,
    isFavorite,
    add,
    remove,
    storageAvailable,
    isFull,
  }
}
