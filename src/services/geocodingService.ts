import type { PhotonFeature, SearchLocation } from '../types/gis.types'

const PHOTON_ENDPOINT = 'https://photon.komoot.io/api'
const cache = new Map<string, SearchLocation[]>()

function formatFeature(feature: PhotonFeature, index: number): SearchLocation {
  const p = feature.properties
  const parts = [p.name || p.street, p.city || p.county, p.state, p.country]
    .filter((part, i, all): part is string => Boolean(part) && all.indexOf(part) === i)

  return {
    id: `${p.osm_type ?? 'place'}-${p.osm_id ?? index}`,
    name: p.name || p.street || 'Ubicación',
    label: parts.join(', '),
    position: [feature.geometry.coordinates[1], feature.geometry.coordinates[0]],
  }
}

export async function buscarDirecciones(query: string, signal?: AbortSignal): Promise<SearchLocation[]> {
  const normalized = query.trim().toLocaleLowerCase('es')
  if (normalized.length < 3) return []

  const cached = cache.get(normalized)
  if (cached) return cached

  const params = new URLSearchParams({
    q: query.trim(),
    lat: '-2.170998',
    lon: '-79.922359',
    limit: '5',
  })

  let response: Response
  try {
    response = await fetch(`${PHOTON_ENDPOINT}?${params}`, { signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new Error('No se pudo contactar al buscador de direcciones. Revisa tu conexión e inténtalo nuevamente.')
  }

  if (!response.ok) throw new Error(`El buscador de direcciones respondió con un error (${response.status}).`)

  const data = (await response.json()) as { features?: PhotonFeature[] }
  const results = (data.features ?? [])
    .filter((feature) => feature.geometry?.type === 'Point')
    .map(formatFeature)

  cache.set(normalized, results)
  return results
}
