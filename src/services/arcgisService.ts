import clipping, { type MultiPolygon, type Ring } from 'polygon-clipping'
import type { ArcGisGeometry } from '../types/gis.types'

const EDIFICACIONES_URL = 'https://idgn.ecuadorencifras.gob.ec/server/rest/services/Hosted/Marco_Geoestadistico_2022/FeatureServer/9/query'
const POBLACION_URL = 'https://services7.arcgis.com/NWWHhu45fOJtCgG3/ArcGIS/rest/services/Censo_de_Poblaci%C3%B3n_INEC_2022/FeatureServer/9/query'
const GET_URL_LIMIT = 1900
const TIMEOUT_MS = 30_000

interface ArcGisErrorResponse {
  error?: { message?: string; details?: string[] }
}

function createRequestSignal(externalSignal?: AbortSignal) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort('timeout'), TIMEOUT_MS)
  const abortFromExternal = () => controller.abort(externalSignal?.reason)
  if (externalSignal?.aborted) abortFromExternal()
  else externalSignal?.addEventListener('abort', abortFromExternal, { once: true })

  return {
    signal: controller.signal,
    cleanup: () => {
      window.clearTimeout(timeoutId)
      externalSignal?.removeEventListener('abort', abortFromExternal)
    },
  }
}

async function requestArcGis<T>(endpoint: string, params: URLSearchParams, externalSignal?: AbortSignal): Promise<T> {
  const { signal, cleanup } = createRequestSignal(externalSignal)
  const fullUrl = `${endpoint}?${params.toString()}`

  try {
    const response = await fetch(fullUrl.length <= GET_URL_LIMIT ? fullUrl : endpoint, {
      method: fullUrl.length <= GET_URL_LIMIT ? 'GET' : 'POST',
      headers: fullUrl.length <= GET_URL_LIMIT
        ? undefined
        : { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: fullUrl.length <= GET_URL_LIMIT ? undefined : params.toString(),
      signal,
    })

    if (!response.ok) throw new Error(`El servicio respondió con estado HTTP ${response.status}.`)

    const data = (await response.json()) as T & ArcGisErrorResponse
    if (data.error) {
      const detail = data.error.details?.filter(Boolean).join(' ') || data.error.message
      throw new Error(detail || 'El servicio ArcGIS rechazó la consulta.')
    }
    return data
  } catch (error) {
    if (externalSignal?.aborted) throw new DOMException('Consulta cancelada', 'AbortError')
    if (signal.aborted) throw new Error('La consulta tardó más de 30 segundos y fue cancelada.')
    if (error instanceof TypeError) {
      throw new Error('No fue posible acceder al servicio. Puede existir un problema de red o una restricción CORS del servidor.')
    }
    throw error
  } finally {
    cleanup()
  }
}

function baseGeometryParams(geometry: ArcGisGeometry) {
  return {
    where: '1=1',
    geometry: JSON.stringify(geometry),
    geometryType: 'esriGeometryPolygon',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
  }
}

export async function consultarEdificaciones(geometry: ArcGisGeometry, signal?: AbortSignal): Promise<number> {
  const params = new URLSearchParams({
    ...baseGeometryParams(geometry),
    returnCountOnly: 'true',
    f: 'json',
  })
  const data = await requestArcGis<{ count?: number | null }>(EDIFICACIONES_URL, params, signal)
  if (typeof data.count !== 'number') throw new Error('El servicio de edificaciones no devolvió un conteo válido.')
  return data.count
}

interface PopulationFeature {
  attributes: { FID: number; 'Población': number | null }
  geometry: { rings: Ring[] }
}

function ringArea(ring: Ring): number {
  const [originX, originY] = ring[0]
  let twiceArea = 0
  for (let i = 1; i < ring.length - 1; i++) {
    const [x, y] = ring[i]
    const [nextX, nextY] = ring[i + 1]
    twiceArea += (x - originX) * (nextY - originY) - (nextX - originX) * (y - originY)
  }
  return Math.abs(twiceArea) / 2
}

// At sector scale in Ecuador, the ratio of areas in lon/lat approximates the ground-area ratio.
function area(geometry: MultiPolygon): number {
  return geometry.reduce((total, [exterior, ...holes]) =>
    total + ringArea(exterior) - holes.reduce((sum, hole) => sum + ringArea(hole), 0), 0)
}

export async function consultarPoblacion(geometries: ArcGisGeometry[], signal?: AbortSignal): Promise<number> {
  const masks = geometries.map(({ rings }) => rings as Ring[])
  const selection = clipping.union(masks[0], ...masks.slice(1))
  if (area(selection) <= 0) throw new Error('Dibuja un polígono con un área válida.')

  const sectors = new Map<number, PopulationFeature>()
  for (const geometry of geometries) {
    const params = new URLSearchParams({
      ...baseGeometryParams(geometry),
      outFields: 'FID,Población',
      outSR: '4326',
      returnGeometry: 'true',
      orderByFields: 'FID',
      resultRecordCount: '200',
      f: 'json',
    })
    let offset = 0
    let foundSector = false
    while (true) {
      params.set('resultOffset', String(offset))
      const data = await requestArcGis<{
        features?: PopulationFeature[]
        exceededTransferLimit?: boolean
      }>(POBLACION_URL, params, signal)
      if (!Array.isArray(data.features)) throw new Error('El servicio no devolvió los sectores censales.')
      foundSector ||= data.features.length > 0
      for (const sector of data.features) sectors.set(sector.attributes.FID, sector)
      if (!data.exceededTransferLimit) break
      if (data.features.length === 0) throw new Error('El servicio devolvió una consulta incompleta.')
      offset += data.features.length
    }
    if (!foundSector) throw new Error('Los datos de población del INEC no están disponibles para el área del polígono.')
  }

  let total = 0
  let covered = false
  for (const { attributes, geometry } of sectors.values()) {
    const rings = geometry?.rings
    if (!rings?.length) throw new Error('Un sector censal no tiene geometría disponible.')
    // Apply even-odd fill to ArcGIS rings, including holes and disconnected parts.
    const sector = clipping.xor([rings[0]], ...rings.slice(1).map((ring) => [ring]))
    const sectorArea = area(sector)
    if (sectorArea <= 0) throw new Error('Un sector censal tiene una geometría inválida.')
    const inside = area(clipping.intersection(selection, sector))
    if (inside <= 0) continue
    const population = attributes['Población']
    if (typeof population !== 'number' || !Number.isFinite(population) || population < 0) {
      throw new Error('Faltan datos de población en un sector del área seleccionada.')
    }
    total += population * Math.min(1, inside / sectorArea)
    covered = true
  }
  if (!covered) throw new Error('La fuente de población no tiene datos para el área seleccionada.')
  return total
}
