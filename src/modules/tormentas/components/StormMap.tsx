import { useEffect } from 'react'
import L, { type LatLngTuple } from 'leaflet'
import { Circle, MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import type { LightningFlash, MonitoringPoint } from '../types'
import { SatelliteLayer } from './SatelliteLayer'
import { LightningLayer } from './LightningLayer'
import { PrecipitationLayer } from './PrecipitationLayer'
import { InfraredCloudLayer } from './InfraredCloudLayer'

const ECUADOR: LatLngTuple = [-1.45, -78.4]
const pointIcon = L.divIcon({ className: 'storm-reference-marker', html: '<span></span>', iconSize: [28, 28], iconAnchor: [14, 14] })

function MapEvents({ onPoint }: { onPoint: (point: MonitoringPoint) => void }) {
  useMapEvents({ click: (event) => onPoint({ position: [event.latlng.lat, event.latlng.lng], label: 'Punto seleccionado en el mapa' }) })
  return null
}

function Recenter({ point }: { point: MonitoringPoint | null }) {
  const map = useMap()
  useEffect(() => { if (point) map.flyTo(point.position, Math.max(map.getZoom(), 8), { duration: 0.8 }) }, [point, map])
  return null
}

function ResizeSync() {
  const map = useMap()
  useEffect(() => { const observer = new ResizeObserver(() => map.invalidateSize()); observer.observe(map.getContainer()); return () => observer.disconnect() }, [map])
  return null
}

interface Props {
  point: MonitoringPoint | null; flashes: LightningFlash[]; satellite: boolean; infrared: boolean; precipitation: boolean; lightning: boolean
  opacity: number; satelliteTime: string | null; infraredTime: string | null; precipitationTime: string | null; onPoint: (point: MonitoringPoint) => void
}

export function StormMap(props: Props) {
  return (
    <MapContainer center={ECUADOR} zoom={7} minZoom={2} worldCopyJump className="storm-map" zoomControl>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <SatelliteLayer visible={props.satellite} opacity={props.opacity} time={props.satelliteTime} />
      <InfraredCloudLayer visible={props.infrared} opacity={props.opacity} time={props.infraredTime} />
      <PrecipitationLayer visible={props.precipitation} opacity={Math.min(0.82, props.opacity + 0.08)} time={props.precipitationTime} />
      <LightningLayer flashes={props.flashes} visible={props.lightning} />
      {props.point && <>
        <Circle center={props.point.position} radius={40_000} pathOptions={{ color: '#167d8a', weight: 2, dashArray: '8 7', fillOpacity: 0.02 }}><Tooltip permanent direction="top" className="radius-label radius-label-40">40 km</Tooltip></Circle>
        <Circle center={props.point.position} radius={10_000} pathOptions={{ color: '#d49a24', weight: 2, dashArray: '5 5', fillOpacity: 0.035 }}><Tooltip permanent direction="bottom" className="radius-label radius-label-10">10 km</Tooltip></Circle>
        <Marker position={props.point.position} icon={pointIcon} />
      </>}
      <MapEvents onPoint={props.onPoint} /><Recenter point={props.point} /><ResizeSync />
    </MapContainer>
  )
}
