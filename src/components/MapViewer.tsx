import { useEffect, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import type { LatLngTuple } from 'leaflet'
import L from 'leaflet'
import { PolygonDraw } from './PolygonDraw'
import type { SearchLocation } from '../types/gis.types'
import { InfraredCloudLayer } from '../modules/tormentas/components/InfraredCloudLayer'
import { PrecipitationLayer } from '../modules/tormentas/components/PrecipitationLayer'

const GUAYAQUIL: LatLngTuple = [-2.170998, -79.922359]

function getUrlCenter(search: string): LatLngTuple | null {
  const params = new URLSearchParams(search)
  const latitude = params.get('latitud') ?? params.get('lat')
  const longitude = params.get('longitud') ?? params.get('lng')
  if (!latitude?.trim() || !longitude?.trim()) return null

  const lat = Number(latitude)
  const lng = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null
  }

  return [lat, lng]
}

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
  polygons: LatLngTuple[][]
  location: SearchLocation | null
  clearToken: number
  infraredVisible: boolean
  infraredOpacity: number
  infraredTime: string | null
  precipitationVisible: boolean
  precipitationOpacity: number
  precipitationTime: string | null
  onPolygonsChange: (polygons: LatLngTuple[][]) => void
  onDrawingChange: (drawing: boolean) => void
}

export function MapViewer({
  polygons, location, clearToken,
  infraredVisible, infraredOpacity, infraredTime,
  precipitationVisible, precipitationOpacity, precipitationTime,
  onPolygonsChange, onDrawingChange,
}: Props) {
  const [urlCenter] = useState(() => getUrlCenter(window.location.search))

  return (
    <MapContainer center={urlCenter ?? GUAYAQUIL} zoom={urlCenter ? 16 : 13} minZoom={5} className="map" zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <InfraredCloudLayer visible={infraredVisible} opacity={infraredOpacity} time={infraredTime} />
      <PrecipitationLayer visible={precipitationVisible} opacity={precipitationOpacity} time={precipitationTime} />
      <MapResizeSync />
      <PolygonDraw
        polygons={polygons}
        clearToken={clearToken}
        onChange={onPolygonsChange}
        onDrawingChange={onDrawingChange}
      />
      <Recenter location={location} />
      {urlCenter && (
        <Marker position={urlCenter} icon={markerIcon} title="Punto de referencia" alt="Punto de referencia" />
      )}
      {location && <Marker position={location.position} icon={markerIcon} />}
    </MapContainer>
  )
}
