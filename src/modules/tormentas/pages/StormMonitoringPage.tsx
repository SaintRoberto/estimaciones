import { useCallback, useEffect, useMemo, useState } from 'react'
import { AddressSearch } from '../../../components/AddressSearch'
import type { SearchLocation } from '../../../types/gis.types'
import { StormControls } from '../components/StormControls'
import { StormMap } from '../components/StormMap'
import { StormStats } from '../components/StormStats'
import { TimelinePlayer } from '../components/TimelinePlayer'
import { getAvailableSatelliteTimes, getLatestInfraredTime, getLatestPrecipitationTime } from '../services/nasaGibsService'
import { getLightningFlashes } from '../services/noaaGlmService'
import { getForecast } from '../services/weatherService'
import type { ForecastSummary, LightningFlash, MonitoringPoint } from '../types'
import { lightningStats } from '../utils/geoCalculations'
import '../storm.css'

interface Props {
  theme: 'light' | 'dark'
  onThemeChange: (theme: 'light' | 'dark') => void
}

export function StormMonitoringPage({ theme, onThemeChange }: Props) {
  const [point, setPoint] = useState<MonitoringPoint | null>({ position: [-2.170998, -79.922359], label: 'Guayaquil' })
  const [satelliteVisible, setSatelliteVisible] = useState(false)
  const [infraredVisible, setInfraredVisible] = useState(false)
  const [precipitationVisible, setPrecipitationVisible] = useState(true)
  const [lightningVisible, setLightningVisible] = useState(true)
  const [forecastVisible, setForecastVisible] = useState(true)
  const [opacity, setOpacity] = useState(0.72)
  const [period, setPeriod] = useState<15 | 30 | 60>(15)
  const [times, setTimes] = useState<string[]>([])
  const [precipitationTime, setPrecipitationTime] = useState<string | null>(null)
  const [infraredTime, setInfraredTime] = useState<string | null>(null)
  const [timeIndex, setTimeIndex] = useState(0)
  const [flashes, setFlashes] = useState<LightningFlash[]>([])
  const [forecast, setForecast] = useState<ForecastSummary | null>(null)
  const [satelliteError, setSatelliteError] = useState<string | null>(null)
  const [precipitationError, setPrecipitationError] = useState<string | null>(null)
  const [infraredError, setInfraredError] = useState<string | null>(null)
  const [lightningError, setLightningError] = useState<string | null>(null)
  const [forecastError, setForecastError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const load = () => getAvailableSatelliteTimes(controller.signal).then((values) => {
      setTimes((previous) => {
        setTimeIndex((current) => current >= previous.length - 1 ? Math.max(0, values.length - 1) : Math.min(current, Math.max(0, values.length - 1)))
        return values
      })
      setSatelliteError(null); setUpdatedAt(new Date().toISOString())
    }).catch((error: unknown) => { if (!controller.signal.aborted) setSatelliteError(error instanceof Error ? error.message : 'NASA GIBS no está disponible.') })
    void load()
    const loadPrecipitation = () => getLatestPrecipitationTime(controller.signal).then((value) => {
      setPrecipitationTime(value); setPrecipitationError(null); setUpdatedAt(new Date().toISOString())
    }).catch((error: unknown) => { if (!controller.signal.aborted) setPrecipitationError(error instanceof Error ? error.message : 'NASA IMERG no está disponible.') })
    void loadPrecipitation()
    const loadInfrared = () => getLatestInfraredTime(controller.signal).then((value) => {
      setInfraredTime(value); setInfraredError(null)
    }).catch((error: unknown) => { if (!controller.signal.aborted) setInfraredError(error instanceof Error ? error.message : 'La imagen infrarroja no está disponible.') })
    void loadInfrared()
    const timer = window.setInterval(load, 5 * 60_000)
    const precipitationTimer = window.setInterval(loadPrecipitation, 10 * 60_000)
    const infraredTimer = window.setInterval(loadInfrared, 5 * 60_000)
    return () => { controller.abort(); window.clearInterval(timer); window.clearInterval(precipitationTimer); window.clearInterval(infraredTimer) }
  }, [])

  useEffect(() => {
    if (!lightningVisible) return
    const controller = new AbortController()
    const load = () => getLightningFlashes(period, controller.signal).then((values) => {
      setFlashes(values); setLightningError(null); setUpdatedAt(new Date().toISOString())
    }).catch((error: unknown) => { if (!controller.signal.aborted) { setFlashes([]); setLightningError(error instanceof Error ? error.message : 'NOAA GLM no está disponible.') } })
    void load()
    const timer = window.setInterval(load, 2 * 60_000)
    return () => { controller.abort(); window.clearInterval(timer) }
  }, [period, lightningVisible])

  useEffect(() => {
    if (!point || !forecastVisible) { setForecast(null); setForecastError(null); return }
    const controller = new AbortController()
    const load = () => getForecast(point.position[0], point.position[1], controller.signal).then((value) => {
      setForecast(value); setForecastError(null); setUpdatedAt(new Date().toISOString())
    }).catch((error: unknown) => { if (!controller.signal.aborted) { setForecast(null); setForecastError(error instanceof Error ? error.message : 'Pronóstico no disponible.') } })
    void load()
    const timer = window.setInterval(load, 15 * 60_000)
    return () => { controller.abort(); window.clearInterval(timer) }
  }, [point, forecastVisible])

  const stats = useMemo(() => point ? lightningStats(point.position, flashes) : { nearestKm: null, within10Km: 0, within40Km: 0 }, [point, flashes])
  const selectedTime = times[timeIndex] ?? null
  const selectSearchLocation = (location: SearchLocation) => setPoint({ position: location.position, label: location.label })
  const locate = () => navigator.geolocation?.getCurrentPosition(
    (position) => setPoint({ position: [position.coords.latitude, position.coords.longitude], label: 'Mi ubicación' }),
    () => setForecastError('No fue posible acceder a tu ubicación. Revisa el permiso del navegador.'),
    { enableHighAccuracy: true, timeout: 10_000 },
  )
  const onTimelineChange = useCallback((index: number) => setTimeIndex(index), [])
  const serviceIssues = [satelliteError, precipitationError, infraredError, lightningError, forecastError].filter(Boolean).length
  const mapObservation = precipitationVisible
    ? ['PRECIPITACIÓN OBSERVADA', 'NASA IMERG · medición satelital disponible']
    : infraredVisible
      ? ['NUBES INFRARROJAS', 'GOES-East ABI · topes fríos resaltados']
      : satelliteVisible
        ? ['NUBES GEOCOLOR', 'GOES-East · apariencia natural']
        : ['MAPA BASE', 'Sin capa meteorológica activa']

  return (
    <main className="storm-page">
      <header className="storm-header">
        <div><p>Vigilancia meteorológica</p><h1>Monitoreo de Tormentas</h1><span>Observaciones satelitales y actividad eléctrica sobre Ecuador</span></div>
        <div className="storm-header-search"><AddressSearch onSelect={selectSearchLocation} /><small>También puedes hacer clic en cualquier punto del mapa</small></div>
        <div className="storm-header-actions">
          <button className="theme-toggle" type="button" onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')} aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'} title={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}>{theme === 'light' ? '☾' : '☀'}</button>
          <div className={`services-pill ${serviceIssues ? 'warning' : ''}`}><i /> <span><strong>{serviceIssues ? 'Servicios parciales' : 'Servicios operativos'}</strong><small>{updatedAt ? `Actualizado ${new Intl.DateTimeFormat('es-EC', { timeZone: 'America/Guayaquil', hour: '2-digit', minute: '2-digit' }).format(new Date(updatedAt))} ECT` : 'Actualizando…'}</small></span></div>
        </div>
      </header>
      <div className="storm-workspace">
        <StormControls satellite={satelliteVisible} infrared={infraredVisible} precipitation={precipitationVisible} lightning={lightningVisible} forecast={forecastVisible} opacity={opacity} period={period} onSatellite={setSatelliteVisible} onInfrared={setInfraredVisible} onPrecipitation={setPrecipitationVisible} onLightning={setLightningVisible} onForecast={setForecastVisible} onOpacity={setOpacity} onPeriod={setPeriod} onLocate={locate} />
        <section className="storm-map-column">
          <div className="storm-map-frame">
            <StormMap point={point} flashes={flashes} satellite={satelliteVisible} infrared={infraredVisible} precipitation={precipitationVisible} lightning={lightningVisible} opacity={opacity} satelliteTime={selectedTime} infraredTime={infraredTime} precipitationTime={precipitationTime} onPoint={setPoint} />
            <div className="storm-map-badge"><span>●</span><div><strong>{point?.label ?? 'Selecciona un punto'}</strong><small>{point ? `${point.position[0].toFixed(4)}, ${point.position[1].toFixed(4)}` : 'Haz clic en el mapa'}</small></div></div>
            <div className="observation-badge"><b>{mapObservation[0]}</b> {mapObservation[1]}</div>
          </div>
          <TimelinePlayer times={times} index={timeIndex} onChange={onTimelineChange} />
        </section>
        <StormStats flashes={flashes} within10={stats.within10Km} within40={stats.within40Km} nearestKm={stats.nearestKm} satelliteTime={selectedTime} satelliteError={satelliteError} precipitationTime={precipitationTime} precipitationError={precipitationError} lightningError={lightningError} forecast={forecastVisible ? forecast : null} forecastError={forecastError} />
      </div>
    </main>
  )
}
