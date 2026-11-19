import { Alert, Button, Radio, Slider, Spin, Switch } from 'antd'
import type { Indicator, QueryResult } from '../types/gis.types'
import { ResultCard } from './ResultCard'

interface Props {
  indicator: Indicator
  polygonCount: number
  isDrawing: boolean
  loading: boolean
  error: string | null
  result: QueryResult | null
  infraredVisible: boolean
  infraredOpacity: number
  infraredTime: string | null
  infraredLoading: boolean
  infraredError: string | null
  precipitationVisible: boolean
  precipitationOpacity: number
  precipitationTime: string | null
  precipitationLoading: boolean
  precipitationError: string | null
  onIndicatorChange: (indicator: Indicator) => void
  onInfraredVisibleChange: (visible: boolean) => void
  onInfraredOpacityChange: (opacity: number) => void
  onPrecipitationVisibleChange: (visible: boolean) => void
  onPrecipitationOpacityChange: (opacity: number) => void
  onConsult: () => void
  onClear: () => void
  onCollapse: () => void
}

export function QueryPanel(props: Props) {
  const {
    indicator, polygonCount, isDrawing, loading, error, result,
    infraredVisible, infraredOpacity, infraredTime, infraredLoading, infraredError,
    precipitationVisible, precipitationOpacity, precipitationTime, precipitationLoading, precipitationError,
    onIndicatorChange, onInfraredVisibleChange, onInfraredOpacityChange,
    onPrecipitationVisibleChange, onPrecipitationOpacityChange,
    onConsult, onClear, onCollapse,
  } = props

  const hasPolygon = polygonCount > 0

  const infraredTimestamp = infraredTime
    ? new Intl.DateTimeFormat('es-EC', {
      timeZone: 'America/Guayaquil', day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(infraredTime))
    : null
  const precipitationTimestamp = precipitationTime
    ? new Intl.DateTimeFormat('es-EC', {
      timeZone: 'America/Guayaquil', day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(precipitationTime))
    : null

  return (
    <aside className="query-panel">
      <div className="panel-heading">
        <span className="step-number">01</span>
        <div>
          <p className="kicker">Configura tu consulta</p>
          <h1>Analiza áreas</h1>
        </div>
        <Button
          className="collapse-panel-button"
          type="text"
          onClick={onCollapse}
          title="Ocultar panel de consulta"
          aria-label="Ocultar panel de consulta"
        >
          ‹
        </Button>
      </div>

      <div className="instruction">
        <span className={hasPolygon ? 'instruction-dot ready' : 'instruction-dot'} />
        <div>
          <strong>{isDrawing ? 'Dibujo en curso' : hasPolygon ? `${polygonCount} ${polygonCount === 1 ? 'polígono listo' : 'polígonos listos'}` : 'Dibuja un polígono'}</strong>
          <p>{
            isDrawing
              ? 'Agrega los vértices que necesites y vuelve al primer punto para cerrar.'
              : hasPolygon
                ? 'Puedes dibujar otro polígono o editar los que ya cerraste.'
                : 'Elige una de las herramientas situadas en la esquina derecha del mapa.'
          }</p>
        </div>
      </div>

      <div className="field-group">
        <label>Indicador</label>
        <Radio.Group
          className="indicator-options"
          value={indicator}
          onChange={(event) => onIndicatorChange(event.target.value as Indicator)}
        >
          <Radio.Button value="poblacion">
            <span className="option-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="7" r="3" />
                <path d="M6.5 20v-2.3a5.5 5.5 0 0 1 11 0V20M5 10.5A2.5 2.5 0 0 0 2.5 13v2M19 10.5a2.5 2.5 0 0 1 2.5 2.5v2M4.5 8a2 2 0 1 1 0-4M19.5 8a2 2 0 1 0 0-4" />
              </svg>
            </span>
            <span><strong>Estimación Personas</strong><small>Sectores intersectados</small></span>
          </Radio.Button>
          <Radio.Button value="edificaciones">
            <span className="option-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M4 21V5l8-3v19M12 8h8v13M2 21h20M7 7h2M7 11h2M7 15h2M15 11h2M15 15h2" />
              </svg>
            </span>
            <span><strong>Estimación Edificaciones</strong><small>Edificios censales</small></span>
          </Radio.Button>
        </Radio.Group>
      </div>

      <div className="weather-layer-control">
        <div className="weather-layer-heading">
          <span className="weather-layer-icon precipitation-layer-icon" aria-hidden="true">▧</span>
          <span>
            <strong>Precipitación observada</strong>
            <small>NASA IMERG · cada 30 minutos</small>
          </span>
          <Switch
            checked={precipitationVisible}
            loading={precipitationLoading}
            onChange={onPrecipitationVisibleChange}
            aria-label="Mostrar precipitación observada NASA IMERG"
          />
        </div>
        {precipitationVisible && (
          <div className="weather-layer-details">
            <div><span>Opacidad</span><strong>{Math.round(precipitationOpacity * 100)}%</strong></div>
            <Slider min={0.2} max={1} step={0.05} value={precipitationOpacity} onChange={onPrecipitationOpacityChange} />
            <div className="rain-legend" aria-label="Escala de intensidad de lluvia">
              <div className="rain-legend-gradient" />
              <div><span>0.1</span><span>1</span><span>5</span><span>20+</span></div>
              <small>mm/h · verde a rojo</small>
            </div>
            {precipitationTimestamp && <small>Observación: {precipitationTimestamp} ECT</small>}
            {precipitationError && <small className="weather-layer-error">{precipitationError}</small>}
          </div>
        )}
      </div>

      <div className="weather-layer-control">
        <div className="weather-layer-heading">
          <span className="weather-layer-icon" aria-hidden="true">☁</span>
          <span>
            <strong>Nubes infrarrojas</strong>
            <small>GOES-East · resalta topes fríos</small>
          </span>
          <Switch
            checked={infraredVisible}
            loading={infraredLoading}
            onChange={onInfraredVisibleChange}
            aria-label="Mostrar nubes infrarrojas GOES-East"
          />
        </div>
        {infraredVisible && (
          <div className="weather-layer-details">
            <div><span>Opacidad</span><strong>{Math.round(infraredOpacity * 100)}%</strong></div>
            <Slider min={0.2} max={1} step={0.05} value={infraredOpacity} onChange={onInfraredOpacityChange} />
            {infraredTimestamp && <small>Imagen: {infraredTimestamp} ECT</small>}
            {infraredError && <small className="weather-layer-error">{infraredError}</small>}
          </div>
        )}
      </div>

      <Button type="primary" size="large" block disabled={!hasPolygon || isDrawing} loading={loading} onClick={onConsult}>
        {polygonCount > 1 ? 'Consultar total de las áreas' : 'Consultar área seleccionada'}
      </Button>
      <Button className="clear-polygon-button" size="large" block disabled={(!hasPolygon && !isDrawing) || loading} onClick={onClear}>
        {isDrawing ? 'Cancelar dibujo' : 'Limpiar polígonos'}
      </Button>

      {error && <Alert className="query-error" type="error" showIcon message="No se pudo completar la consulta" description={error} />}
      {loading && <div className="loading-state"><Spin /><span>Consultando el servicio censal…</span></div>}
      {result && !loading && <ResultCard result={result} />}
      {polygonCount > 1 && <small>Si un mismo sector censal o edificio intersecta varias áreas, puede contarse varias veces.</small>}

      <div className="panel-footer">
        <span>Fuentes de datos</span>
        <strong>INEC Censo 2022 · NASA GIBS</strong>
      </div>
    </aside>
  )
}
