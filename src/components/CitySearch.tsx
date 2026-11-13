
import React, { useId, useMemo, useRef, useState } from 'react'
import { Search, Loader2, MapPin, AlertCircle } from 'lucide-react'
import { useCitySearch } from '../hooks/useCitySearch'
import { City, GeoError } from '../types'

export interface CitySearchProps {
  onSelect: (city: City) => void
  placeholder?: string
}

function getGeoErrorMessage(error: GeoError): string {
  switch (error.kind) {
    case 'rate_limit':
      return 'Too many searches too quickly. Wait a few seconds and try again.'
    case 'network':
      return 'You appear to be offline. Check your connection and try again.'
    case 'auth':
      return 'API key invalid or missing. Please verify your RapidAPI credentials.'
    case 'server':
      return 'City search service is currently unavailable. Please try again later.'
    case 'unknown':
    default:
      return 'An unexpected error occurred. Please try again.'
  }
}

export function CitySearch({
  onSelect,
  placeholder = 'Search city (e.g. London, Tokyo)...',
}: CitySearchProps) {
  const { query, setQuery, results, status, error, retry } = useCitySearch()
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [selectedCityName, setSelectedCityName] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()
  const errorId = useId()

  const shouldShowDropdown = useMemo(() => {
    if (!isOpen) return false
    return status === 'loading' || status === 'empty' || status === 'error' || status === 'success'
  }, [isOpen, status])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setSelectedCityName(null)
    setActiveIndex(-1)
    if (validationError) setValidationError(null)
    setIsOpen(true)
  }

  const handleSelectCity = (city: City) => {
    const formatted = city.region
      ? `${city.name}, ${city.region}, ${city.country}`
      : `${city.name}, ${city.country}`

    setQuery(formatted)
    setSelectedCityName(formatted)
    setValidationError(null)
    setIsOpen(false)
    setActiveIndex(-1)
    onSelect(city)
  }

  const handleBlur = (e: React.FocusEvent) => {
    if (containerRef.current && containerRef.current.contains(e.relatedTarget as Node)) return

    const trimmed = query.trim()
    if (!trimmed) {
      setValidationError('Enter a city name to search.')
    } else if (!selectedCityName || selectedCityName.toLowerCase() !== trimmed.toLowerCase()) {
      setValidationError('Pick a city from the suggestions.')
    } else {
      setValidationError(null)
    }

    setIsOpen(false)
    setActiveIndex(-1)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (isOpen && activeIndex >= 0 && results[activeIndex]) {
      handleSelectCity(results[activeIndex])
      return
    }

    const trimmed = query.trim()
    if (!trimmed) {
      setValidationError('Enter a city name to search.')
      inputRef.current?.focus()
    } else if (!selectedCityName || selectedCityName.toLowerCase() !== trimmed.toLowerCase()) {
      setValidationError('Pick a city from the suggestions.')
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!isOpen) setIsOpen(true)
      else if (results.length > 0) {
        setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0))
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (isOpen && results.length > 0) {
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1))
      }
    } else if (e.key === 'Enter') {
      if (isOpen && activeIndex >= 0 && results[activeIndex]) {
        e.preventDefault()
        handleSelectCity(results[activeIndex])
      }
    } else if (e.key === 'Escape' && isOpen) {
      e.preventDefault()
      setIsOpen(false)
      setActiveIndex(-1)
    }
  }

  const activeOptionId =
    activeIndex >= 0 && results[activeIndex]
      ? `${listboxId}-option-${results[activeIndex].id}`
      : undefined

  return (
    <div ref={containerRef} className="relative w-full max-w-full">
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="city-search-input" className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#777]">
          Find a location
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-[#777]" />
          <input
            ref={inputRef}
            id="city-search-input"
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={shouldShowDropdown}
            aria-controls={listboxId}
            aria-activedescendant={activeOptionId}
            aria-invalid={Boolean(validationError)}
            aria-describedby={validationError ? errorId : undefined}
            value={query}
            onChange={handleInputChange}
            onFocus={() => {
              if (query.trim().length >= 2) setIsOpen(true)
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck="false"
            className={`min-h-[52px] w-full rounded-xl border bg-[#141414] py-3 pl-11 pr-12 text-sm text-white outline-none transition placeholder:text-[#626262] ${
              validationError
                ? 'border-rose-500/70 focus:border-rose-400'
                : 'border-white/[0.1] focus:border-white/30'
            }`}
          />
          {status === 'loading' && (
            <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#aaa]" />
          )}
        </div>
      </form>

      {validationError && (
        <p id={errorId} role="alert" className="mt-2 flex items-center gap-1.5 text-xs text-rose-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {validationError}
        </p>
      )}

      {shouldShowDropdown && (
        <div className="absolute left-0 right-0 z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-white/10 bg-[#151515] p-1.5 shadow-[0_18px_55px_rgba(0,0,0,0.65)]">
          {status === 'loading' && (
            <div className="space-y-1.5 p-1" aria-live="polite" aria-busy="true">
              {[0, 1, 2].map((idx) => (
                <div key={idx} className="flex min-h-[48px] items-center gap-3 rounded-lg bg-[#202020] px-3 py-2">
                  <div className="h-4 w-4 rounded-full bg-[#383838]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-28 rounded bg-[#383838]" />
                    <div className="h-2.5 w-40 rounded bg-[#303030]" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {status === 'error' && error && (
            <div className="p-4 text-center">
              <AlertCircle className="mx-auto mb-2 h-5 w-5 text-rose-400" />
              <p className="text-xs leading-5 text-[#aaa]">{getGeoErrorMessage(error)}</p>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => retry()}
                className="mt-3 min-h-[40px] rounded-lg border border-white/10 bg-[#242424] px-4 text-xs font-semibold text-white transition hover:bg-[#303030]"
              >
                Retry Search
              </button>
            </div>
          )}

          {status === 'empty' && (
            <div className="p-4 text-center text-xs leading-5 text-[#888]">
              No cities found for &apos;{query.trim()}&apos;. Check the spelling or try a nearby larger city.
            </div>
          )}

          {status === 'success' && results.length > 0 && (
            <ul id={listboxId} role="listbox" aria-label="City suggestions" className="space-y-1">
              {results.map((city, index) => {
                const isSelected = index === activeIndex
                const optionId = `${listboxId}-option-${city.id}`
                const locationDetails = [city.region, city.country].filter(Boolean).join(', ')

                return (
                  <li
                    key={city.id}
                    id={optionId}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectCity(city)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`flex min-h-[48px] cursor-pointer items-center justify-between rounded-lg px-3 py-2 transition ${
                      isSelected ? 'bg-[#2a2a2a]' : 'hover:bg-[#202020]'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3 pr-2">
                      <MapPin className={`h-4 w-4 shrink-0 ${isSelected ? 'text-[#d0b78b]' : 'text-[#777]'}`} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#eee]">{city.name}</p>
                        {locationDetails && (
                          <p className="truncate text-xs text-[#777]">{locationDetails}</p>
                        )}
                      </div>
                    </div>
                    {city.countryCode && (
                      <span className="shrink-0 rounded border border-white/[0.08] bg-[#202020] px-2 py-1 font-mono text-[10px] text-[#888]">
                        {city.countryCode}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
