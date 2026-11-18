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
  externalSignal?.addEventListener('abort', abortFromExternal, { once: true })

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

export async function consultarPoblacion(geometry: ArcGisGeometry, signal?: AbortSignal): Promise<number> {
  const statistics = [{
    statisticType: 'sum',
    onStatisticField: 'Población',
    outStatisticFieldName: 'total_personas',
  }]
  const params = new URLSearchParams({
    ...baseGeometryParams(geometry),
    returnGeometry: 'false',
    outStatistics: JSON.stringify(statistics),
    f: 'json',
  })
  const data = await requestArcGis<{
    features?: Array<{ attributes?: { total_personas?: number | null } }>
  }>(POBLACION_URL, params, signal)
  const value = data.features?.[0]?.attributes?.total_personas
  if (value === null || value === undefined || !Number.isFinite(value)) {
    throw new Error('El servicio de población no devolvió un valor válido para esta área.')
  }
  return value
}
