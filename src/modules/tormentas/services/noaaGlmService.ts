import type { LightningFlash, LightningResponse } from '../types'

export async function getLightningFlashes(minutes: 15 | 30 | 60, signal?: AbortSignal): Promise<LightningFlash[]> {
  const response = await fetch(`/api/lightning?minutes=${minutes}`, { signal })
  if (!response.ok) {
    if (response.status === 404) throw new Error('La función serverless NOAA GLM no está desplegada.')
    throw new Error(`El servicio NOAA GLM respondió ${response.status}.`)
  }
  if (!response.headers.get('content-type')?.includes('json')) {
    throw new Error('La función serverless NOAA GLM no está desplegada.')
  }
  const payload = await response.json() as LightningResponse
  return payload.features.map((feature) => ({
    id: String(feature.id),
    longitude: feature.geometry.coordinates[0],
    latitude: feature.geometry.coordinates[1],
    observedAt: feature.properties.observedAt,
  }))
}
