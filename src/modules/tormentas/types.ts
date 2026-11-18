import type { LatLngTuple } from 'leaflet'

export interface LightningFlash {
  id: string
  latitude: number
  longitude: number
  observedAt: string
}

export interface LightningResponse {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    id: string
    geometry: { type: 'Point'; coordinates: [number, number] }
    properties: { observedAt: string; source: string }
  }>
  metadata: {
    source: string
    satellite: string
    requestedMinutes: number
    generatedAt: string
    filesProcessed: number
  }
}

export interface ForecastSummary {
  forecastAt: string
  precipitationProbability: number | null
  precipitationMm: number | null
  weatherCode: number | null
  currentAt: string
  currentPrecipitationMm: number | null
  currentRainMm: number | null
  currentShowersMm: number | null
  currentWeatherCode: number | null
  modelSuggestsRain: boolean
  source: string
}

export interface MonitoringPoint {
  position: LatLngTuple
  label: string
}
