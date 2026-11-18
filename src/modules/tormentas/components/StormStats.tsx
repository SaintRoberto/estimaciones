import type { ForecastSummary, LightningFlash } from '../types'
import { ageLabel, formatGuayaquil } from './stormFormatters'

interface Props {
  flashes: LightningFlash[]; within10: number; within40: number; nearestKm: number | null
  satelliteTime: string | null; satelliteError: string | null; lightningError: string | null
  precipitationTime: string | null; precipitationError: string | null
  forecast: ForecastSummary | null; forecastError: string | null
}

export function StormStats(props: Props) {
  const latestFlash = props.flashes.reduce<string | null>((latest, flash) => !latest || flash.observedAt > latest ? flash.observedAt : latest, null)
  return (
    <aside className="storm-stats storm-card">
      <div className="storm-section-heading"><span>Resumen de monitoreo</span><small>Alrededor del punto</small></div>
      <section className="priority-weather-section">
        <div className="stat-title"><span className="status-dot cyan" />Modelo y pronóstico del punto</div>
        {props.forecastError ? <p className="service-message error">{props.forecastError}</p> : props.forecast ? <>
          <div className="weather-priority-grid">
            <div className={`current-rain-status ${props.forecast.modelSuggestsRain ? 'raining' : 'dry'}`}>
              <span className="weather-card-eyebrow">Ahora · modelo</span>
              <span className="current-rain-icon">≈</span>
              <strong>{props.forecast.modelSuggestsRain ? 'Modelo estima precipitación' : 'Modelo sin precipitación'}</strong>
              <small>{props.forecast.currentPrecipitationMm ?? 0} mm calculados para la hora precedente</small>
              <em>Sin confirmación local</em>
              <time>{formatGuayaquil(props.forecast.currentAt)}</time>
            </div>
            <div className="next-hour-status">
              <span className="weather-card-eyebrow">Próxima hora</span>
              <strong>{props.forecast.precipitationProbability ?? '—'}%</strong>
              <small>{props.forecast.precipitationMm ?? '—'} mm previstos</small>
              <time>{formatGuayaquil(props.forecast.forecastAt)}</time>
            </div>
          </div>
          <small className="forecast-source">{props.forecast.source}</small>
        </> : <p className="service-message">Selecciona un punto para consultar las condiciones.</p>}
      </section>
      <section>
        <div className="stat-title"><span className="status-dot amber" />Actividad eléctrica</div>
        {props.lightningError ? <p className="service-message error">Datos no disponibles. {props.lightningError}</p> : props.flashes.length === 0 ? <p className="service-message">Sin detecciones registradas en el período.</p> : null}
        <div className="stat-grid"><div><strong>{props.flashes.length}</strong><span>flashes visibles</span></div><div><strong>{props.nearestKm === null ? '—' : `${props.nearestKm.toFixed(1)} km`}</strong><span>más cercano</span></div></div>
        <div className="radius-counts"><span><b>{props.within10}</b> dentro de 10 km</span><span><b>{props.within40}</b> dentro de 40 km</span></div>
        <div className="stat-time"><span>Última detección</span><b>{formatGuayaquil(latestFlash)}</b></div>
      </section>
      <section>
        <div className="stat-title"><span className="status-dot blue" />Precipitación observada</div>
        {props.precipitationError ? <p className="service-message error">Datos no disponibles. {props.precipitationError}</p> : <><div className="satellite-age">{ageLabel(props.precipitationTime)}</div><div className="stat-time"><span>Medición IMERG</span><b>{formatGuayaquil(props.precipitationTime)}</b></div><small className="forecast-source">Estimación satelital de tasa de lluvia; no es radar terrestre.</small></>}
        {props.satelliteError ? null : <div className="stat-time secondary-observation"><span>Imagen de nubes</span><b>{formatGuayaquil(props.satelliteTime)}</b></div>}
      </section>
      <p className="experimental-note">Información orientativa. No constituye una alerta meteorológica oficial.</p>
    </aside>
  )
}
