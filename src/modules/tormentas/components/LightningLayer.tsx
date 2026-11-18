import { useMemo, useState } from 'react'
import { CircleMarker, Popup, useMapEvents } from 'react-leaflet'
import type { LightningFlash } from '../types'
import { formatGuayaquil } from './stormFormatters'

interface Props { flashes: LightningFlash[]; visible: boolean }

export function LightningLayer({ flashes, visible }: Props) {
  const [zoom, setZoom] = useState(7)
  const map = useMapEvents({ zoomend: () => setZoom(map.getZoom()) })
  const clusters = useMemo(() => {
    if (!visible) return []
    const cell = zoom >= 10 ? 0.025 : zoom >= 8 ? 0.08 : 0.2
    const grouped = new Map<string, LightningFlash[]>()
    flashes.forEach((flash) => {
      const key = `${Math.round(flash.latitude / cell)}:${Math.round(flash.longitude / cell)}`
      grouped.set(key, [...(grouped.get(key) ?? []), flash])
    })
    return [...grouped.values()].map((items) => ({
      items,
      latitude: items.reduce((sum, item) => sum + item.latitude, 0) / items.length,
      longitude: items.reduce((sum, item) => sum + item.longitude, 0) / items.length,
    }))
  }, [flashes, visible, zoom])

  return <>{clusters.map((cluster) => {
    const latest = cluster.items.reduce((value, item) => item.observedAt > value ? item.observedAt : value, '')
    return (
      <CircleMarker
        key={`${cluster.latitude}:${cluster.longitude}:${cluster.items.length}`}
        center={[cluster.latitude, cluster.longitude]}
        radius={cluster.items.length > 1 ? Math.min(18, 7 + Math.log2(cluster.items.length) * 2) : 5}
        pathOptions={{ color: '#fff4c2', weight: 1.5, fillColor: '#f5b942', fillOpacity: 0.9 }}
      >
        <Popup>
          <strong>{cluster.items.length === 1 ? 'Flash detectado' : `${cluster.items.length} flashes agrupados`}</strong><br />
          Última detección: {formatGuayaquil(latest)}<br />
          <small>Detección óptica GLM; no confirma descarga nube-tierra.</small>
        </Popup>
      </CircleMarker>
    )
  })}</>
}
