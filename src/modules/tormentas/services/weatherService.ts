import type { ForecastSummary } from '../types'

const PRECIPITATION_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 85, 86, 95, 96, 99])
const asUtc = (value: string) => value.endsWith('Z') ? value : `${value}Z`

interface OpenMeteoResponse {
  current?: {
    time?: string
    precipitation?: number | null
    rain?: number | null
    showers?: number | null
    weather_code?: number | null
  }
  hourly?: {
    time?: string[]
    precipitation_probability?: Array<number | null>
    precipitation?: Array<number | null>
    weather_code?: Array<number | null>
  }
}

export async function getForecast(latitude: number, longitude: number, signal?: AbortSignal): Promise<ForecastSummary | null> {
  const params = new URLSearchParams({
    latitude: String(latitude), longitude: String(longitude),
    hourly: 'precipitation_probability,precipitation,weather_code',
    current: 'precipitation,rain,showers,weather_code',
    forecast_hours: '12', timezone: 'UTC',
  })
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal })
  if (!response.ok) throw new Error(`Open-Meteo respondió ${response.status}.`)
  const data = await response.json() as OpenMeteoResponse
  if (!data.hourly?.time?.length) return null
  const now = Date.now()
  const index = data.hourly.time.findIndex((time) => Date.parse(asUtc(time)) >= now)
  const selected = index >= 0 ? index : 0
  const currentCode = data.current?.weather_code ?? null
  const currentPrecipitation = data.current?.precipitation ?? null
  return {
    forecastAt: asUtc(data.hourly.time[selected]),
    precipitationProbability: data.hourly.precipitation_probability?.[selected] ?? null,
    precipitationMm: data.hourly.precipitation?.[selected] ?? null,
    weatherCode: data.hourly.weather_code?.[selected] ?? null,
    currentAt: asUtc(data.current?.time ?? data.hourly.time[selected]),
    currentPrecipitationMm: currentPrecipitation,
    currentRainMm: data.current?.rain ?? null,
    currentShowersMm: data.current?.showers ?? null,
    currentWeatherCode: currentCode,
    modelSuggestsRain: (currentPrecipitation ?? 0) > 0 || (currentCode !== null && PRECIPITATION_CODES.has(currentCode)),
    source: 'Open-Meteo (modelo meteorológico, no radar ni estación)',
  }
}
