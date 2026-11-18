import type { WMSParams } from 'leaflet'
import { WMSTileLayer } from 'react-leaflet'
import { GIBS_WMS_URL, INFRARED_LAYER } from '../services/nasaGibsService'

interface Props { visible: boolean; opacity: number; time: string | null }

export function InfraredCloudLayer({ visible, opacity, time }: Props) {
  if (!visible || !time) return null
  const wmsTime = time.replace('.000Z', 'Z')
  return (
    <WMSTileLayer
      key={wmsTime}
      className="infrared-cloud-layer"
      url={GIBS_WMS_URL}
      layers={INFRARED_LAYER}
      format="image/png"
      transparent
      opacity={opacity}
      params={{ layers: INFRARED_LAYER, format: 'image/png', transparent: true, time: wmsTime } as WMSParams}
      attribution='Infrarrojo: <a href="https://earthdata.nasa.gov/gibs">NASA GIBS / GOES-East ABI</a>'
    />
  )
}
