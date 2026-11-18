import type { WMSParams } from 'leaflet'
import { WMSTileLayer } from 'react-leaflet'
import { GIBS_WMS_URL, PRECIPITATION_LAYER } from '../services/nasaGibsService'

interface Props { visible: boolean; opacity: number; time: string | null }

export function PrecipitationLayer({ visible, opacity, time }: Props) {
  if (!visible || !time) return null
  const wmsTime = time.replace('.000Z', 'Z')
  return (
    <WMSTileLayer
      key={wmsTime}
      url={GIBS_WMS_URL}
      layers={PRECIPITATION_LAYER}
      format="image/png"
      transparent
      opacity={opacity}
      params={{ layers: PRECIPITATION_LAYER, format: 'image/png', transparent: true, time: wmsTime } as WMSParams}
      attribution='Precipitación: <a href="https://earthdata.nasa.gov/gibs">NASA GIBS / IMERG</a>'
    />
  )
}
