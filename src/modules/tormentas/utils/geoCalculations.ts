import type { LatLngTuple } from 'leaflet'
import type { LightningFlash } from '../types'

const EARTH_RADIUS_KM = 6371.0088

const radians = (degrees: number) => degrees * Math.PI / 180

export function haversineKm(from: LatLngTuple, to: LatLngTuple): number {
  const lat1 = radians(from[0])
  const lon1 = radians(from[1])
  const lat2 = radians(to[0])
  const lon2 = radians(to[1])
  const deltaLat = lat2 - lat1
  const deltaLon = lon2 - lon1
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

export function lightningStats(point: LatLngTuple, flashes: LightningFlash[]) {
  const distances = flashes.map((flash) => ({
    flash,
    distance: haversineKm(point, [flash.latitude, flash.longitude]),
  })).sort((a, b) => a.distance - b.distance)

  return {
    nearestKm: distances[0]?.distance ?? null,
    within10Km: distances.filter((item) => item.distance <= 10).length,
    within40Km: distances.filter((item) => item.distance <= 40).length,
  }
}
