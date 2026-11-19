import { useEffect, useState } from 'react'
import type { LatLngTuple } from 'leaflet'
import { ConfigProvider } from 'antd'
import { AddressSearch } from './components/AddressSearch'
import { MapViewer } from './components/MapViewer'
import { QueryPanel } from './components/QueryPanel'
import { usePolygonQuery } from './hooks/usePolygonQuery'
import type { Indicator, SearchLocation } from './types/gis.types'
import { StormMonitoringPage } from './modules/tormentas/pages/StormMonitoringPage'
import { getLatestInfraredTime, getLatestPrecipitationTime } from './modules/tormentas/services/nasaGibsService'

type AppRoute = '/' | '/tormentas'

function currentRoute(): AppRoute {
  return window.location.pathname === '/tormentas' ? '/tormentas' : '/'
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>(currentRoute)
  const [stormTheme, setStormTheme] = useState<'light' | 'dark'>(() =>
    window.localStorage.getItem('storm-theme') === 'dark' ? 'dark' : 'light')
  const [polygons, setPolygons] = useState<LatLngTuple[][]>([])
  const [indicator, setIndicator] = useState<Indicator>('edificaciones')
  const [location, setLocation] = useState<SearchLocation | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [clearToken, setClearToken] = useState(0)
  const [panelOpen, setPanelOpen] = useState(true)
  const [infraredVisible, setInfraredVisible] = useState(false)
  const [infraredOpacity, setInfraredOpacity] = useState(0.62)
  const [infraredTime, setInfraredTime] = useState<string | null>(null)
  const [infraredLoading, setInfraredLoading] = useState(false)
  const [infraredError, setInfraredError] = useState<string | null>(null)
  const [precipitationVisible, setPrecipitationVisible] = useState(false)
  const [precipitationOpacity, setPrecipitationOpacity] = useState(0.72)
  const [precipitationTime, setPrecipitationTime] = useState<string | null>(null)
  const [precipitationLoading, setPrecipitationLoading] = useState(false)
  const [precipitationError, setPrecipitationError] = useState<string | null>(null)
  const { result, loading, error, consult } = usePolygonQuery(polygons, indicator)

  useEffect(() => {
    const onPopState = () => setRoute(currentRoute())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    window.localStorage.setItem('storm-theme', stormTheme)
  }, [stormTheme])

  useEffect(() => {
    if (!infraredVisible) return
    const controller = new AbortController()
    const loadInfrared = () => {
      setInfraredLoading(true)
      getLatestInfraredTime(controller.signal).then((value) => {
        setInfraredTime(value)
        setInfraredError(null)
      }).catch((caught: unknown) => {
        if (!controller.signal.aborted) {
          setInfraredError(caught instanceof Error ? caught.message : 'La imagen infrarroja no está disponible.')
        }
      }).finally(() => {
        if (!controller.signal.aborted) setInfraredLoading(false)
      })
    }
    loadInfrared()
    const timer = window.setInterval(loadInfrared, 5 * 60_000)
    return () => { controller.abort(); window.clearInterval(timer) }
  }, [infraredVisible])

  useEffect(() => {
    if (!precipitationVisible) return
    const controller = new AbortController()
    const loadPrecipitation = () => {
      setPrecipitationLoading(true)
      getLatestPrecipitationTime(controller.signal).then((value) => {
        setPrecipitationTime(value)
        setPrecipitationError(null)
      }).catch((caught: unknown) => {
        if (!controller.signal.aborted) {
          setPrecipitationError(caught instanceof Error ? caught.message : 'La precipitación observada no está disponible.')
        }
      }).finally(() => {
        if (!controller.signal.aborted) setPrecipitationLoading(false)
      })
    }
    loadPrecipitation()
    const timer = window.setInterval(loadPrecipitation, 10 * 60_000)
    return () => { controller.abort(); window.clearInterval(timer) }
  }, [precipitationVisible])

  const navigate = (nextRoute: AppRoute) => {
    if (nextRoute !== route) window.history.pushState({}, '', nextRoute)
    setRoute(nextRoute)
  }

  return (
    <ConfigProvider theme={{
      token: {
        colorPrimary: '#136f63',
        colorInfo: '#136f63',
        borderRadius: 10,
        fontFamily: 'Inter, Avenir, Helvetica, Arial, sans-serif',
      },
    }}>
      <div className={`app-shell ${route === '/tormentas' ? `storm-app-shell storm-theme-${stormTheme}` : ''}`}>
        <header className="topbar">
          <button className="brand brand-button" type="button" onClick={() => navigate('/')} aria-label="Ir al mapa de estimación">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img">
                <path d="M12 2.5a7 7 0 0 0-7 7c0 5.1 7 12 7 12s7-6.9 7-12a7 7 0 0 0-7-7Zm0 10.25A3.25 3.25 0 1 1 12 6a3.25 3.25 0 0 1 0 6.5Z" />
                <circle cx="12" cy="9.25" r="1.35" />
              </svg>
            </span>
            <span><strong>Mapa Monitoreo</strong><small>SNGR</small></span>
          </button>
          {route === '/' ? <AddressSearch onSelect={setLocation} /> : <div className="topbar-module-title">Monitoreo meteorológico de Ecuador</div>}
          <nav className="module-nav" aria-label="Módulos principales">
            <button className={route === '/' ? 'active' : ''} type="button" onClick={() => navigate('/')}>Estimaciones</button>
            <button className={route === '/tormentas' ? 'active storm-nav-button' : 'storm-nav-button'} type="button" onClick={() => navigate('/tormentas')}>Tormentas</button>
          </nav>
        </header>

        {route === '/tormentas' ? <StormMonitoringPage theme={stormTheme} onThemeChange={setStormTheme} /> : <main className={`workspace ${panelOpen ? 'panel-open' : 'panel-closed'}`}>
          {panelOpen && (
            <QueryPanel
              indicator={indicator}
              polygonCount={polygons.length}
              isDrawing={isDrawing}
              loading={loading}
              error={error}
              result={result}
              infraredVisible={infraredVisible}
              infraredOpacity={infraredOpacity}
              infraredTime={infraredTime}
              infraredLoading={infraredLoading}
              infraredError={infraredError}
              precipitationVisible={precipitationVisible}
              precipitationOpacity={precipitationOpacity}
              precipitationTime={precipitationTime}
              precipitationLoading={precipitationLoading}
              precipitationError={precipitationError}
              onIndicatorChange={setIndicator}
              onInfraredVisibleChange={setInfraredVisible}
              onInfraredOpacityChange={setInfraredOpacity}
              onPrecipitationVisibleChange={setPrecipitationVisible}
              onPrecipitationOpacityChange={setPrecipitationOpacity}
              onConsult={consult}
              onCollapse={() => setPanelOpen(false)}
              onClear={() => {
                setClearToken((current) => current + 1)
              }}
            />
          )}
          <section className="map-stage">
            <MapViewer
              polygons={polygons}
              location={location}
              clearToken={clearToken}
              infraredVisible={infraredVisible}
              infraredOpacity={infraredOpacity}
              infraredTime={infraredTime}
              precipitationVisible={precipitationVisible}
              precipitationOpacity={precipitationOpacity}
              precipitationTime={precipitationTime}
              onPolygonsChange={setPolygons}
              onDrawingChange={setIsDrawing}
            />
            <div className="map-caption">
              <span className="live-dot" />
              <span><strong>{precipitationVisible ? 'Precipitación observada' : infraredVisible ? 'Nubes infrarrojas' : 'Mapa interactivo'}</strong><small>{precipitationVisible ? 'NASA IMERG · intensidad estimada' : infraredVisible ? 'GOES-East · topes fríos resaltados' : 'Busca, dibuja y consulta'}</small></span>
            </div>
            {!panelOpen && (
              <button
                className="open-panel-button"
                type="button"
                onClick={() => setPanelOpen(true)}
                title="Mostrar panel de consulta"
                aria-label="Mostrar panel de consulta"
              >
                ›
              </button>
            )}
            <div className="map-help">Haz clic para crear vértices · Pulsa el primer punto para cerrar</div>
          </section>
        </main>}
      </div>
    </ConfigProvider>
  )
}
