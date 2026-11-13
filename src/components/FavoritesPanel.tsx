
import React, { useState } from 'react'
import { AlertTriangle, MapPin, Star, Trash2 } from 'lucide-react'
import { useFavorites } from '../hooks/useFavorites'
import { City } from '../types'
import { ConfirmDialog } from './ConfirmDialog'

interface FavoritesPanelProps {
  selectedCityId: number | null
  onSelectCity: (city: City) => void
}

export const FavoritesPanel: React.FC<FavoritesPanelProps> = ({
  selectedCityId,
  onSelectCity,
}) => {
  const { favorites, remove, storageAvailable } = useFavorites()
  const [cityPendingRemove, setCityPendingRemove] = useState<City | null>(null)

  const handleConfirmRemove = () => {
    if (cityPendingRemove) {
      remove(cityPendingRemove.id)
      setCityPendingRemove(null)
    }
  }

  return (
    <>
      <section aria-label="Favourite Cities" className="rounded-2xl border border-white/[0.09] bg-[#111] p-4 sm:p-5">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-400/15 bg-amber-400/[0.07]">
              <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Favourites</h2>
              <p className="mt-0.5 text-[10px] text-[#777]">Your saved locations</p>
            </div>
          </div>
          <span className="rounded-md border border-white/[0.08] bg-[#1b1b1b] px-2.5 py-1 font-mono text-[11px] text-[#aaa]">
            {favorites.length}/5
          </span>
        </div>

        {!storageAvailable && (
          <div role="status" className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-3 text-xs leading-5 text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Favourites can&apos;t be saved on this device. They&apos;ll be lost when you close the tab.</p>
          </div>
        )}

        {favorites.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#1b1b1b]">
              <Star className="h-4 w-4 text-[#777]" />
            </div>
            <p className="text-xs leading-5 text-[#858585]">
              No favourites yet. Search for a city and tap the star to save it here.
            </p>
          </div>
        ) : (
          <ul className="mt-3 space-y-2" role="list">
            {favorites.map((city) => {
              const isSelected = selectedCityId === city.id
              const locationMeta = [city.region, city.country].filter(Boolean).join(', ')

              return (
                <li
                  key={city.id}
                  className={`group flex items-center justify-between rounded-xl border transition-colors ${
                    isSelected
                      ? 'border-white/20 bg-[#252525]'
                      : 'border-white/[0.06] bg-[#171717] hover:border-white/15 hover:bg-[#1d1d1d]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectCity(city)}
                    className="flex min-h-[54px] min-w-0 flex-1 items-center gap-3 rounded-l-xl px-3 py-2 text-left focus:outline-none focus:ring-2 focus:ring-white/20"
                  >
                    <MapPin className={`h-4 w-4 shrink-0 ${isSelected ? 'text-[#d0b78b]' : 'text-[#777]'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-[#eee] sm:text-sm">{city.name}</p>
                      <p className="truncate text-[10px] text-[#777] sm:text-xs">{locationMeta}</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCityPendingRemove(city)}
                    aria-label={`Remove ${city.name} from favourites`}
                    className="flex min-h-[48px] min-w-[44px] items-center justify-center rounded-r-xl text-[#666] transition hover:text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <ConfirmDialog
        isOpen={Boolean(cityPendingRemove)}
        title={`Remove ${cityPendingRemove?.name ?? ''} from favourites?`}
        description="This will remove the city from your quick-access favourites panel."
        confirmText="Remove"
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmRemove}
        onCancel={() => setCityPendingRemove(null)}
      />
    </>
  )
}
