# WeatherBoard

A responsive, installable weather dashboard. Search any city, see current conditions and a 5-day forecast, save favourite cities, keep working offline for the last viewed city, and set a daily morning weather reminder.

Built as a technical challenge for Edspire (Frontend React Developer).

- **Live app:** https://YOUR-APP.vercel.app
- **Repository:** https://github.com/syedahsanrazabukhari/weatherboard
- **IDE used:** Google Antigravity (see [PROMPTS.md](./PROMPTS.md) for the full prompt history)

## Features

| Requirement | What is implemented |
|---|---|
| City search with autocomplete | GeoDB Cities API via RapidAPI. 300 ms debounce, in-flight request cancellation, loading skeleton rows, a no-results state and specific error messages with a Retry button. Accessible combobox (ARIA roles, arrow keys, Enter, Escape). |
| Weather data | Current temperature, feels-like, humidity, wind speed, condition and a 5-day forecast from OpenWeatherMap, with Open-Meteo as an automatic fallback. Real data only. Loading skeleton and typed, specific error messages for every failure. |
| Form validation | Validation on blur and on submit. Handles: empty city field, text typed but no suggestion picked, no results, network failure, rate limit, bad credentials, timeout. |
| Favourite cities | Up to 5 cities in `localStorage`, a quick-access panel with a counter, confirmation before removal, validation of stored data, sync across tabs, and an in-memory fallback if storage is blocked. |
| PWA | Web manifest (192, 512 and maskable 512 icons, `standalone`), a custom service worker (app shell precache plus weather caching), an offline banner and instant startup from the last saved report. |
| Push / notifications | Daily reminder with a user-chosen time, explained in our own dialog before the browser permission prompt, a test notification, and a clear message when notifications are unsupported or blocked. See [Notifications](#notifications-and-their-limits). |
| Responsive design | Checked at 375 px, 768 px and 1280 px. No page-level horizontal scroll. 44 px minimum touch targets on interactive controls. |
| Bonus: animated condition icons | Custom SVG icons for 8 conditions (day and night) with CSS-only animations. `prefers-reduced-motion` is respected. |

Not implemented: dark/light toggle (the app is dark only) and the °C/°F toggle. Temperatures are stored in Celsius internally, so a unit toggle can be added without refetching.

## Tech stack

- React 19, TypeScript, Vite
- Tailwind CSS v4 (`@tailwindcss/vite`)
- `vite-plugin-pwa` with the `injectManifest` strategy and a hand-written service worker (`src/sw.ts`) using Workbox modules
- `idb-keyval` (IndexedDB, so the service worker can read reminder settings)
- `lucide-react` (UI icons only; weather icons are custom SVG)
- Vitest for unit tests

## Getting started

Requirements: Node.js 20 or newer.

```bash
git clone https://github.com/syedahsanrazabukhari/weatherboard.git
cd weatherboard
npm install
```

Create a file named `.env.local` in the project root (it is git-ignored). `.env.example` lists the variable names:

```bash
VITE_OWM_API_KEY=your_openweathermap_key
VITE_RAPIDAPI_KEY=your_rapidapi_key
VITE_RAPIDAPI_HOST=wft-geo-db.p.rapidapi.com
```

Get the keys from:

- OpenWeatherMap: free signup at openweathermap.org (a new key can take a while to activate)
- GeoDB Cities: subscribe to the free plan on RapidAPI

Run it:

```bash
npm run dev        # development server at http://localhost:5173
npm test           # unit tests
npm run build      # type-check and production build
npm run preview    # serve the production build at http://localhost:4173
```

**Test the PWA features with `npm run build && npm run preview`.** The service worker is deliberately disabled in `npm run dev` so development behaves like a normal React app.

`npm run generate-icons` regenerates the PNG icons in `public/` from the SVG sources using `sharp`.

### Deploying (Vercel)

1. Import the repository in Vercel (framework preset: Vite).
2. Add the three `VITE_` environment variables above in the project settings.
3. Deploy. Vite env variables are baked in at build time, so redeploy after changing them.

## Architecture decisions

**A provider-independent weather model.** Both weather APIs are mapped to one normalized `WeatherReport` (`src/types`). The UI never sees provider-specific fields, so the fallback is invisible to components. Values are stored in Celsius and m/s and converted only for display (wind is shown in km/h).

**Forecast grouping by the city's own timezone.** OpenWeatherMap's free `/forecast` returns 40 three-hourly entries. They are grouped by the city's local date, using the `timezone` offset returned by the API instead of the browser's timezone, so viewing Tokyo from Karachi gives the right days. Daily min and max come from all entries of the day, and the representative condition from the entry closest to local noon. This is covered by unit tests with a +9 h (Tokyo) and a -5 h (New York) fixture, each asserting exactly 5 days.

**Provider fallback rules.** OpenWeatherMap is tried first. On any non-network failure (401/403 for a key that is not active yet, 429, 5xx, a 6 s timeout, or a malformed response) the app falls back to Open-Meteo and shows a small "Backup data source" badge. A genuine offline failure does not fall back (both providers would fail) and shows the offline error instead. User-initiated cancellations are silent.

**GeoDB's 1 request per second limit.** The free plan allows one request per second. The search combines: 300 ms debounce, `AbortController` cancellation of stale requests, an in-memory cache keyed by the lowercase query, a scheduler that never fires two real requests less than about 1.1 s apart, and one automatic retry after a 429.

**No flicker on refresh (stale-while-revalidate).** The last successful report is saved and shown immediately on startup with its "Updated" time, then refreshed in the background with a small spinner. The skeleton only appears when there is no data for the selected city. A request-ID guard in `useWeather` makes sure only the latest request can update the UI.

**Service worker.** The app shell is precached with a navigation fallback so the app loads offline. Weather requests (`api.openweathermap.org`, `api.open-meteo.com`) use `NetworkFirst` with an 8 s timeout, status-200-only caching and `maxEntries: 4`. GeoDB autocomplete requests are never cached. Offline startup does not depend on the Cache API: the last report is also stored through the safe storage helper.

**Resilient storage.** Every `localStorage` access is wrapped in try/catch with an availability probe at startup. If storage is blocked or full, favourites live in memory for the session and the panel explains it. Stored JSON is validated on read.

**Reminder settings in IndexedDB.** Service workers cannot read `localStorage`, so reminder settings (including the city's coordinates) are stored in IndexedDB, where both the app and the service worker can read them.

**Custom weather icons.** Weather icons are inline SVG with CSS animations. This avoids remote icon images (which would break offline and caching), has no animation library cost, and honours `prefers-reduced-motion`.

## APIs used

| API | Used for | Key |
|---|---|---|
| OpenWeatherMap (`/data/2.5/weather`, `/data/2.5/forecast`) | Primary current weather and forecast | Yes (free tier) |
| Open-Meteo (`/v1/forecast`) | Fallback weather, and weather for background reminders | No |
| GeoDB Cities via RapidAPI | City autocomplete | Yes (free tier) |
| Notifications API, Service Worker, Periodic Background Sync | Daily reminder | No |

## Notifications and their limits

How the daily reminder works:

1. The user turns on the reminder and picks a time. Before the browser asks, an in-app dialog explains why notifications are needed.
2. If permission is granted, the settings are saved to IndexedDB. A "Send test notification" button shows a real notification with the selected city's current weather.
3. **While WeatherBoard is open** (any tab, or the installed app), it checks on load, when the tab becomes visible and with a timer for the reminder time. It sends the notification once per day.
4. **When the app is closed**, it registers a Periodic Background Sync (`daily-weather`) where the browser supports it. The service worker then fetches weather from Open-Meteo and shows the notification.

**Limitation, stated plainly:** a notification at an exact time while the tab is closed needs a real Web Push server, and this project is client-side only by design. Periodic Background Sync is the closest client-side option, but it only exists in Chromium browsers (Chrome and Edge, desktop and Android), requires the PWA to be installed, and the browser decides when it actually runs, based on how often the app is used, battery and network. So background delivery is **best effort and not guaranteed**. I have not verified delivery at an exact time while the app is closed. Reliable delivery would need a small push backend (for example VAPID Web Push through a serverless function). If notifications are denied or unsupported, the rest of the app is unaffected and the settings card explains the state.

## Known limitations

- **API keys are visible in the browser.** This is a client-side-only app, so the OpenWeatherMap and RapidAPI keys are part of the bundle and appear in network requests. They are free-tier keys. A production version would proxy these calls through a serverless function. The keys are kept out of git (`.env.local` is ignored) and should be rotated after review.
- **GeoDB free tier:** one request per second and a small daily quota. Heavy use shows a rate-limit message with a Retry option.
- **Forecast shape:** the free OpenWeatherMap forecast is 3-hourly, so daily values are aggregated by the app. For "today", the current temperature is included in the min/max.
- **Background reminders** are best effort (see above). Safari and Firefox do not support Periodic Background Sync, and iOS notifications generally require the app to be installed to the home screen.
- **Units:** Celsius only for now. No light theme.
- **Not measured:** I did not run a Lighthouse audit, and background reminder delivery at an exact time has not been verified.

## Testing

- `npm test` runs 7 unit tests: forecast grouping across timezones and the reminder notification helpers.
- Manual checks done in the browser: search states (loading, no results, offline, rate limit, keyboard use), weather in several timezones, fallback with a deliberately wrong key, offline mode, favourites (limit, persistence, confirmation, two-tab sync) and the responsive layouts at 375 px and 1280 px.
- Service worker, offline and install behaviour should be checked on the production build (`npm run build && npm run preview`).

## Project structure

```text
src/
  components/   CitySearch, CurrentWeather, ForecastList, FavoritesPanel,
                ReminderSettings, ConfirmDialog, OfflineBanner, ErrorState,
                WeatherSkeleton, WeatherIcon
  hooks/        useCitySearch, useWeather, useFavorites, useOnlineStatus,
                useForegroundReminder
  services/     geoService, weatherService, owmService, openMeteoService
  lib/          env, safeStorage, notifications, reminderStore, periodicSync,
                weatherReminderNotification, weatherTheme
  types/        shared types and typed errors (GeoError, WeatherError)
  sw.ts         service worker (precache, runtime caching, notifications)
public/         icons and manifest assets
scripts/        icon generation
```

## AI usage

Development used the agentic IDE Google Antigravity as the primary tool, one feature per prompt. The prompts and results, including the bugs the agent introduced (a re-fetch loop after the PWA step, and errors when switching cities) and how they were debugged, are in [PROMPTS.md](./PROMPTS.md). The final visual redesign (animated icons, forecast rows, ambient background) was produced in a Claude chat session after the IDE quota ran out, and applied manually. PROMPTS.md explains exactly what was and was not verified.