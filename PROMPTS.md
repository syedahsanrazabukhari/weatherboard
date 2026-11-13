## Prompt 1: Project setup
I'm building "WeatherBoard", a client-side-only, installable weather dashboard PWA for a frontend technical challenge. Do NOT build any features yet, only the foundation.

Tasks:
1. Scaffold a Vite + React + TypeScript project in the current (empty) folder.
2. Set up Tailwind CSS following its current official Vite instructions.
3. Install and configure vite-plugin-pwa with the injectManifest strategy, so I can write my own custom service worker at src/sw.ts later (needed for notifications). Create a minimal placeholder src/sw.ts.
4. Create this folder structure: src/components, src/hooks, src/services, src/lib, src/types.
5. Add a src/lib/env.ts that reads VITE_OWM_API_KEY, VITE_RAPIDAPI_KEY and VITE_RAPIDAPI_HOST from import.meta.env and warns clearly in the console if any is missing. Add a typed src/vite-env.d.ts for them.
6. Create .env.example with those variable names and empty values, and make sure .env.local and .env are in .gitignore. Never read or print the contents of my .env.local.
7. Add a clean mobile-first base layout in App.tsx: header with "WeatherBoard" title and a placeholder main area. Use a calm, modern palette (think Mercury/Linear), not default Vite styles. Remove all Vite boilerplate.
8. Add the viewport meta tag, a theme-color meta tag, and a proper <title>.
9. Make sure `npm run dev` and `npm run build` both succeed.

Ask me before running any command that isn't npm/npx related. Summarize what you did and any decisions you made at the end.

**Result:** []