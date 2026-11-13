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
      <section
        aria-label="Favourite Cities"
        className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 sm:p-5 backdrop-blur-md shadow-xl"
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-slate-800/70 pb-3">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
            <h2 className="text-sm font-semibold tracking-tight text-slate-100 sm:text-base">
              Favourites
            </h2>
          </div>
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-mono font-medium text-slate-400 border border-slate-700/50">
            {favorites.length}/5
          </span>
        </div>

        {/* Storage Disabled Non-Blocking Notice */}
        {!storageAvailable && (
          <div
            role="status"
            className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
            <p>
              Favourites can&apos;t be saved on this device (browser storage is blocked). They&apos;ll be lost when you close the tab.
            </p>
          </div>
        )}

        {/* Favourites List or Empty State */}
        {favorites.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-xs text-slate-400 sm:text-sm">
              No favourites yet. Search for a city and tap the star to save it here.
            </p>
          </div>
        ) : (
          <ul className="mt-3 space-y-1.5" role="list">
            {favorites.map((city) => {
              const isSelected = selectedCityId === city.id
              const locationMeta = [city.region, city.country].filter(Boolean).join(', ')

              return (
                <li
                  key={city.id}
                  className={`group flex items-center justify-between rounded-xl border transition-all ${
                    isSelected
                      ? 'border-cyan-500/50 bg-slate-800/80 text-slate-100 shadow-xs'
                      : 'border-slate-800/60 bg-slate-900/60 text-slate-300 hover:border-slate-700/80 hover:bg-slate-800/40'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectCity(city)}
                    className="flex flex-1 min-h-[44px] items-center gap-2.5 px-3 py-2 text-left focus:outline-none focus:ring-2 focus:ring-cyan-500/30 rounded-l-xl"
                  >
                    <MapPin
                      className={`h-4 w-4 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold text-slate-100 sm:text-sm">
                        {city.name}
                      </div>
                      <div className="truncate text-[10px] text-slate-400 sm:text-xs">
                        {locationMeta}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCityPendingRemove(city)}
                    aria-label={`Remove ${city.name} from favourites`}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-r-xl text-slate-500 transition-colors hover:text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 active:text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Confirmation Dialog */}
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
