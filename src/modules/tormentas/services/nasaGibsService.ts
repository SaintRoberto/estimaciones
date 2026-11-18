const CAPABILITIES_URL = 'https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0'
export const GIBS_WMS_URL = 'https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi'
export const SATELLITE_LAYER = 'GOES-East_ABI_GeoColor'
export const INFRARED_LAYER = 'GOES-East_ABI_Band13_Clean_Infrared'
export const PRECIPITATION_LAYER = 'IMERG_Precipitation_Rate_30min'
export const PRECIPITATION_LEGEND_URL = 'https://gibs.earthdata.nasa.gov/legends/GPM_Precipitation_Rate_H.png'

let cachedTimes: string[] | null = null
let cachedAt = 0
let capabilitiesText: string | null = null
let capabilitiesPromise: Promise<string> | null = null

async function getCapabilities(signal?: AbortSignal): Promise<Document> {
  if (capabilitiesText && Date.now() - cachedAt < 4 * 60_000) return new DOMParser().parseFromString(capabilitiesText, 'text/xml')
  if (!capabilitiesPromise) {
    capabilitiesPromise = fetch(CAPABILITIES_URL).then(async (response) => {
      if (!response.ok) throw new Error(`NASA GIBS respondió ${response.status}`)
      capabilitiesText = await response.text()
      cachedAt = Date.now()
      return capabilitiesText
    }).finally(() => { capabilitiesPromise = null })
  }
  return new DOMParser().parseFromString(await capabilitiesPromise, 'text/xml')
}

function expandRange(part: string, cutoff: number): string[] {
  const [startText, endText, period] = part.split('/')
  if (!endText) {
    const value = Date.parse(startText)
    return Number.isFinite(value) && value >= cutoff ? [new Date(value).toISOString()] : []
  }
  const stepMinutes = Number(period?.match(/PT(\d+)M/)?.[1] ?? 10)
  const start = Math.max(Date.parse(startText), cutoff)
  const end = Date.parse(endText)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return []
  const first = Math.ceil(start / (stepMinutes * 60_000)) * stepMinutes * 60_000
  const result: string[] = []
  for (let time = first; time <= end; time += stepMinutes * 60_000) result.push(new Date(time).toISOString())
  return result
}

export async function getAvailableSatelliteTimes(signal?: AbortSignal): Promise<string[]> {
  if (cachedTimes && Date.now() - cachedAt < 4 * 60_000) return cachedTimes
  const document = await getCapabilities(signal)
  const layer = [...document.getElementsByTagName('Layer')].find((item) =>
    item.getElementsByTagName('Name')[0]?.textContent === SATELLITE_LAYER)
  const dimension = layer?.getElementsByTagName('Dimension')[0]?.textContent
  if (!dimension) throw new Error('NASA GIBS no publicó tiempos para la capa GeoColor.')
  const latestText = layer?.getElementsByTagName('Dimension')[0]?.getAttribute('default')
  const latest = latestText ? Date.parse(latestText) : Date.now()
  const cutoff = latest - 2 * 60 * 60_000
  const times = dimension.split(',').flatMap((part) => expandRange(part.trim(), cutoff))
  cachedTimes = [...new Set(times)].sort()
  if (!cachedTimes.length && latestText) cachedTimes = [new Date(latest).toISOString()]
  cachedAt = Date.now()
  return cachedTimes
}

export async function getLatestPrecipitationTime(signal?: AbortSignal): Promise<string> {
  const document = await getCapabilities(signal)
  const layer = [...document.getElementsByTagName('Layer')].find((item) =>
    item.getElementsByTagName('Name')[0]?.textContent === PRECIPITATION_LAYER)
  const latest = layer?.getElementsByTagName('Dimension')[0]?.getAttribute('default')
  if (!latest) throw new Error('NASA GIBS no publicó una observación IMERG disponible.')
  return new Date(latest).toISOString()
}

export async function getLatestInfraredTime(signal?: AbortSignal): Promise<string> {
  const document = await getCapabilities(signal)
  const layer = [...document.getElementsByTagName('Layer')].find((item) =>
    item.getElementsByTagName('Name')[0]?.textContent === INFRARED_LAYER)
  const latest = layer?.getElementsByTagName('Dimension')[0]?.getAttribute('default')
  if (!latest) throw new Error('NASA GIBS no publicó una imagen infrarroja disponible.')
  return new Date(latest).toISOString()
}
