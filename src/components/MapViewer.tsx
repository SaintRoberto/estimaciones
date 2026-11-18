import { useEffect } from 'react'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import type { LatLngTuple } from 'leaflet'
import L from 'leaflet'
import { PolygonDraw } from './PolygonDraw'
import type { SearchLocation } from '../types/gis.types'
import { InfraredCloudLayer } from '../modules/tormentas/components/InfraredCloudLayer'
import { PrecipitationLayer } from '../modules/tormentas/components/PrecipitationLayer'

const GUAYAQUIL: LatLngTuple = [-2.170998, -79.922359]

const markerIcon = L.divIcon({
  className: 'search-marker',
  html: '<span></span>',
  iconSize: [24, 30],
  iconAnchor: [12, 30],
})

function Recenter({ location }: { location: SearchLocation | null }) {
  const map = useMap()
  useEffect(() => {
    if (location) map.flyTo(location.position, 16, { duration: 1.1 })
  }, [location, map])
  return null
}

function MapResizeSync() {
  const map = useMap()
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }))
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])
  return null
}

interface Props {
  polygon: LatLngTuple[] | null
  location: SearchLocation | null
  clearToken: number
  infraredVisible: boolean
  infraredOpacity: number
  infraredTime: string | null
  precipitationVisible: boolean
  precipitationOpacity: number
  precipitationTime: string | null
  onPolygonChange: (points: LatLngTuple[] | null) => void
  onDrawingChange: (drawing: boolean) => void
}

export function MapViewer({
  polygon, location, clearToken,
  infraredVisible, infraredOpacity, infraredTime,
  precipitationVisible, precipitationOpacity, precipitationTime,
  onPolygonChange, onDrawingChange,
}: Props) {
  return (
    <MapContainer center={GUAYAQUIL} zoom={13} minZoom={5} className="map" zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <InfraredCloudLayer visible={infraredVisible} opacity={infraredOpacity} time={infraredTime} />
      <PrecipitationLayer visible={precipitationVisible} opacity={precipitationOpacity} time={precipitationTime} />
      <MapResizeSync />
      <PolygonDraw
        polygon={polygon}
        clearToken={clearToken}
        onChange={onPolygonChange}
        onDrawingChange={onDrawingChange}
      />
      <Recenter location={location} />
      {location && <Marker position={location.position} icon={markerIcon} />}
    </MapContainer>
  )
}
