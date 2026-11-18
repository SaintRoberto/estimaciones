import { WMSTileLayer } from 'react-leaflet'
import type { WMSParams } from 'leaflet'
import { GIBS_WMS_URL, SATELLITE_LAYER } from '../services/nasaGibsService'

interface Props { visible: boolean; opacity: number; time: string | null }

export function SatelliteLayer({ visible, opacity, time }: Props) {
  if (!visible || !time) return null
  const wmsTime = time.replace('.000Z', 'Z')
  return (
    <WMSTileLayer
      key={time}
      url={GIBS_WMS_URL}
      layers={SATELLITE_LAYER}
      format="image/png"
      transparent
      opacity={opacity}
      params={{ layers: SATELLITE_LAYER, format: 'image/png', transparent: true, time: wmsTime } as WMSParams}
      attribution='Imagery: <a href="https://earthdata.nasa.gov/gibs">NASA GIBS</a>'
    />
  )
}
