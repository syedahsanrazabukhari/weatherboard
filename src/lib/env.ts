export interface EnvConfig {
  OWM_API_KEY: string
  RAPIDAPI_KEY: string
  RAPIDAPI_HOST: string
}

function resolveEnv(): EnvConfig {
  const OWM_API_KEY = import.meta.env.VITE_OWM_API_KEY ?? ''
  const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY ?? ''
  const RAPIDAPI_HOST = import.meta.env.VITE_RAPIDAPI_HOST ?? ''

  const missingKeys: string[] = []

  if (!OWM_API_KEY) missingKeys.push('VITE_OWM_API_KEY')
  if (!RAPIDAPI_KEY) missingKeys.push('VITE_RAPIDAPI_KEY')
  if (!RAPIDAPI_HOST) missingKeys.push('VITE_RAPIDAPI_HOST')

  if (missingKeys.length > 0) {
    console.warn(
      `[WeatherBoard] Missing environment variable(s):\n${missingKeys
        .map((key) => ` - ${key}`)
        .join('\n')}\nCertain weather data services may be unavailable until configured in .env.local.`
    )
  }

  return {
    OWM_API_KEY,
    RAPIDAPI_KEY,
    RAPIDAPI_HOST,
  }
}

export const env: EnvConfig = resolveEnv()
