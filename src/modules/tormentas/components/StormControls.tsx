interface Props {
  satellite: boolean; infrared: boolean; precipitation: boolean; lightning: boolean; forecast: boolean; opacity: number; period: 15 | 30 | 60
  onSatellite: (value: boolean) => void; onInfrared: (value: boolean) => void; onPrecipitation: (value: boolean) => void; onLightning: (value: boolean) => void
  onForecast: (value: boolean) => void; onOpacity: (value: number) => void
  onPeriod: (value: 15 | 30 | 60) => void; onLocate: () => void
}

export function StormControls(props: Props) {
  return (
    <aside className="storm-controls storm-card">
      <div className="storm-section-heading"><span>Capas y controles</span><small>Fuentes observadas</small></div>
      <label className="layer-toggle primary-layer-toggle">
        <span className="layer-icon precipitation-icon">▧</span><span><strong>Precipitación observada</strong><small>NASA IMERG · cada 30 min</small></span>
        <input type="checkbox" checked={props.precipitation} onChange={(event) => props.onPrecipitation(event.target.checked)} />
      </label>
      <label className="layer-toggle">
        <span className="layer-icon satellite-icon">☁</span><span><strong>Nubes satelitales</strong><small>NASA GIBS · GOES-East</small></span>
        <input type="checkbox" checked={props.satellite} onChange={(event) => props.onSatellite(event.target.checked)} />
      </label>
      <label className="layer-toggle">
        <span className="layer-icon infrared-icon">◐</span><span><strong>Nubes infrarrojas</strong><small>GOES-East · resalta topes fríos</small></span>
        <input type="checkbox" checked={props.infrared} onChange={(event) => props.onInfrared(event.target.checked)} />
      </label>
      <div className="opacity-control"><span>Opacidad</span><strong>{Math.round(props.opacity * 100)}%</strong><input type="range" min="20" max="100" value={props.opacity * 100} onChange={(event) => props.onOpacity(Number(event.target.value) / 100)} /></div>
      <label className="layer-toggle">
        <span className="layer-icon lightning-icon">ϟ</span><span><strong>Actividad eléctrica</strong><small>NOAA GOES-19 · GLM</small></span>
        <input type="checkbox" checked={props.lightning} onChange={(event) => props.onLightning(event.target.checked)} />
      </label>
      <label className="layer-toggle">
        <span className="layer-icon rain-icon">◌</span><span><strong>Pronóstico de lluvia</strong><small>Open-Meteo</small></span>
        <input type="checkbox" checked={props.forecast} onChange={(event) => props.onForecast(event.target.checked)} />
      </label>
      <div className="period-control"><span>Período de rayos</span><div>{([15, 30, 60] as const).map((value) => <button key={value} type="button" className={props.period === value ? 'active' : ''} onClick={() => props.onPeriod(value)}>{value} min</button>)}</div></div>
      <button className="locate-button" type="button" onClick={props.onLocate}>◎ Usar mi ubicación</button>
      <div className="storm-legend"><strong>Intensidad de lluvia observada</strong><div className="rain-rate-gradient" /><div className="rain-rate-scale"><span>0.1</span><span>1</span><span>5</span><span>20+</span></div><small className="rain-rate-unit">mm/h · verde a rojo</small><span><i className="legend-flash" /> Flash óptico GLM</span><span><i className="legend-point" /> Punto de referencia</span><span><i className="legend-radius" /> Radios 10 / 40 km</span></div>
    </aside>
  )
}
