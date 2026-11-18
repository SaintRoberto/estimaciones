import type { LatLngTuple } from 'leaflet'

export type Indicator = 'poblacion' | 'edificaciones'

export interface ArcGisGeometry {
  rings: number[][][]
  spatialReference: { wkid: 4326 }
}

export interface QueryResult {
  indicator: Indicator
  value: number
}

export interface SearchLocation {
  id: string
  name: string
  label: string
  position: LatLngTuple
}

export interface PhotonFeature {
  properties: {
    osm_id?: number
    osm_type?: string
    name?: string
    street?: string
    city?: string
    county?: string
    state?: string
    country?: string
    countrycode?: string
  }
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
}
