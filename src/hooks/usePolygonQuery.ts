import { useCallback, useEffect, useRef, useState } from 'react'
import type { LatLngTuple } from 'leaflet'
import { consultarEdificaciones, consultarPoblacion } from '../services/arcgisService'
import type { ArcGisGeometry, Indicator, QueryResult } from '../types/gis.types'

export function toArcGisGeometry(points: LatLngTuple[]): ArcGisGeometry {
  const ring = points.map(([lat, lng]) => [lng, lat])
  const first = ring[0]
  const last = ring[ring.length - 1]
  if (first && (!last || first[0] !== last[0] || first[1] !== last[1])) ring.push([...first])

  return { rings: [ring], spatialReference: { wkid: 4326 } }
}

export function usePolygonQuery(polygon: LatLngTuple[] | null, indicator: Indicator) {
  const [result, setResult] = useState<QueryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const activeRequest = useRef<AbortController | null>(null)

  useEffect(() => {
    activeRequest.current?.abort()
    activeRequest.current = null
    setResult(null)
    setError(null)
    setLoading(false)
  }, [polygon, indicator])

  useEffect(() => () => activeRequest.current?.abort(), [])

  const consult = useCallback(async () => {
    if (!polygon || polygon.length < 3) return
    activeRequest.current?.abort()
    const controller = new AbortController()
    activeRequest.current = controller
    setLoading(true)
    setError(null)

    try {
      const geometry = toArcGisGeometry(polygon)
      const value = indicator === 'edificaciones'
        ? await consultarEdificaciones(geometry, controller.signal)
        : await consultarPoblacion(geometry, controller.signal)
      if (!controller.signal.aborted) setResult({ indicator, value })
    } catch (caught) {
      if (!controller.signal.aborted) {
        setError(caught instanceof Error ? caught.message : 'Ocurrió un error inesperado durante la consulta.')
      }
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null
        setLoading(false)
      }
    }
  }, [polygon, indicator])

  return { result, loading, error, consult }
}
