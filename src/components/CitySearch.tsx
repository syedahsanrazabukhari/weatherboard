import React, { useId, useMemo, useRef, useState } from 'react'
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

export function CitySearch({ onSelect, placeholder = 'Search city (e.g. London, Tokyo)...' }: CitySearchProps) {
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
    if (validationError) {
      setValidationError(null)
    }
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
    // Prevent validation and closing if moving focus inside the container (e.g. to retry button)
    if (containerRef.current && containerRef.current.contains(e.relatedTarget as Node)) {
      return
    }

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
      if (!isOpen) {
        setIsOpen(true)
      } else if (results.length > 0) {
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
      // Otherwise allow form onSubmit to trigger validation
    } else if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault()
        setIsOpen(false)
        setActiveIndex(-1)
      }
    }
  }

  const activeOptionId = activeIndex >= 0 && results[activeIndex]
    ? `${listboxId}-option-${results[activeIndex].id}`
    : undefined

  return (
    <div ref={containerRef} className="relative w-full max-w-full">
      <form onSubmit={handleSubmit} noValidate>
        <div className="relative">
          {/* Search Icon */}
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </div>

          {/* Combobox Input */}
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
              if (query.trim().length >= 2) {
                setIsOpen(true)
              }
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck="false"
            className={`w-full min-h-[44px] rounded-xl border bg-slate-900/90 pl-10 pr-10 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 shadow-xs outline-none transition-all focus:ring-2 ${
              validationError
                ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/20'
                : 'border-slate-800 focus:border-cyan-500/60 focus:ring-cyan-500/20'
            }`}
          />

          {/* In-field loading spinner */}
          {status === 'loading' && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
              <svg
                className="h-4 w-4 animate-spin text-slate-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            </div>
          )}
        </div>
      </form>

      {/* Inline Validation Error Message */}
      {validationError && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-400"
        >
          <svg
            className="h-3.5 w-3.5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 7.5h.008v.008H12v-.008z"
            />
          </svg>
          <span>{validationError}</span>
        </p>
      )}

      {/* Combobox Dropdown Results & Feedback */}
      {shouldShowDropdown && (
        <div
          className="absolute left-0 right-0 z-50 mt-1.5 max-h-80 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-md"
        >
          {/* Loading Skeleton State */}
          {status === 'loading' && (
            <div className="space-y-1.5 p-1" aria-live="polite" aria-busy="true">
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 animate-pulse bg-slate-800/40"
                >
                  <div className="h-4 w-4 rounded-full bg-slate-700/60" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-28 rounded bg-slate-700/70" />
                    <div className="h-2.5 w-40 rounded bg-slate-700/40" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error State with GeoError details and Retry button */}
          {status === 'error' && error && (
            <div className="p-3.5 text-center sm:p-4">
              <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/10 text-rose-400">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>
              <p className="text-xs font-medium text-rose-300 sm:text-sm">
                {getGeoErrorMessage(error)}
              </p>
              <div className="mt-3">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => retry()}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-750 active:bg-slate-700"
                >
                  Retry Search
                </button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {status === 'empty' && (
            <div className="p-4 text-center">
              <p className="text-xs text-slate-400 sm:text-sm">
                No cities found for &apos;{query.trim()}&apos;. Check the spelling or try a nearby larger city.
              </p>
            </div>
          )}

          {/* Success Suggestions List */}
          {status === 'success' && results.length > 0 && (
            <ul
              id={listboxId}
              role="listbox"
              aria-label="City suggestions"
              className="space-y-0.5"
            >
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
                    onMouseDown={(e) => {
                      // Prevent input blur before click registers
                      e.preventDefault()
                    }}
                    onClick={() => handleSelectCity(city)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`flex min-h-[44px] cursor-pointer items-center justify-between rounded-lg px-3 py-2 transition-colors ${
                      isSelected
                        ? 'bg-slate-800 text-slate-100'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <svg
                        className={`h-4 w-4 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                        />
                      </svg>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-100">
                          {city.name}
                        </div>
                        {locationDetails && (
                          <div className="truncate text-xs text-slate-400">
                            {locationDetails}
                          </div>
                        )}
                      </div>
                    </div>
                    {city.countryCode && (
                      <span className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 border border-slate-700/50">
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
