import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L, { type LatLngTuple } from 'leaflet'
import 'leaflet-draw'

interface Props {
  polygons: LatLngTuple[][]
  clearToken: number
  onChange: (polygons: LatLngTuple[][]) => void
  onDrawingChange: (drawing: boolean) => void
}

const polygonStyle: L.PathOptions = {
  color: '#136f63',
  fillColor: '#21a179',
  fillOpacity: 0.22,
  weight: 3,
}

const vertexStyle: L.PathOptions = {
  color: '#e03b32',
  fillColor: '#e03b32',
  fillOpacity: 0.04,
  weight: 3,
}

type DrawingMode = 'area' | 'vertices'

function layerPoints(layer: L.Layer): LatLngTuple[] | null {
  if (!(layer instanceof L.Polygon)) return null
  const latLngs = layer.getLatLngs()[0] as L.LatLng[]
  return latLngs.map(({ lat, lng }) => [lat, lng])
}

export function PolygonDraw({ polygons, clearToken, onChange, onDrawingChange }: Props) {
  const map = useMap()
  const initialPolygons = useRef(polygons)
  const previousClearToken = useRef(clearToken)
  const clearAllRef = useRef<() => void>(() => undefined)
  const onChangeRef = useRef(onChange)
  const onDrawingChangeRef = useRef(onDrawingChange)
  onChangeRef.current = onChange
  onDrawingChangeRef.current = onDrawingChange

  useEffect(() => {
    const completedGroup = new L.FeatureGroup().addTo(map)
    for (const polygon of initialPolygons.current) L.polygon(polygon, polygonStyle).addTo(completedGroup)
    const draftGroup = new L.FeatureGroup().addTo(map)
    const points: L.LatLng[] = []
    let drawing = false
    let drawingMode: DrawingMode = 'area'
    let drawButton: HTMLAnchorElement | null = null
    let vertexButton: HTMLAnchorElement | null = null
    let restoreDoubleClickZoom = false

    const setDrawing = (value: boolean) => {
      drawing = value
      drawButton?.classList.toggle('is-active', value && drawingMode === 'area')
      vertexButton?.classList.toggle('is-active', value && drawingMode === 'vertices')
      onDrawingChangeRef.current(value)
    }

    const finishDraft = () => {
      draftGroup.clearLayers()
      setDrawing(false)
      if (restoreDoubleClickZoom) {
        map.doubleClickZoom.enable()
        restoreDoubleClickZoom = false
      }
    }

    const publishPolygons = () => {
      const polygons: LatLngTuple[][] = []
      completedGroup.eachLayer((layer) => {
        const vertices = layerPoints(layer)
        if (vertices) polygons.push(vertices)
      })
      onChangeRef.current(polygons)
    }

    const closePolygon = (event?: L.LeafletMouseEvent) => {
      if (event?.originalEvent) L.DomEvent.stopPropagation(event.originalEvent)
      if (points.length < 3) return

      const activeStyle = drawingMode === 'vertices' ? vertexStyle : polygonStyle
      L.polygon(points, activeStyle).addTo(completedGroup)
      finishDraft()
      publishPolygons()
    }

    const redrawDraft = () => {
      draftGroup.clearLayers()
      const activeStyle = drawingMode === 'vertices' ? vertexStyle : polygonStyle

      if (drawingMode === 'area' && points.length >= 3) {
        L.polygon(points, { ...activeStyle, interactive: false }).addTo(draftGroup)
      } else if (points.length >= 2) {
        L.polyline(points, { color: activeStyle.color, weight: activeStyle.weight, interactive: false })
          .addTo(draftGroup)
      }

      points.forEach((point, index) => {
        const marker = L.circleMarker(point, {
          radius: index === 0 ? 8 : 6,
          color: '#ffffff',
          weight: 2,
          fillColor: index === 0
            ? '#d5a641'
            : drawingMode === 'vertices' ? '#e03b32' : '#136f63',
          fillOpacity: 1,
          interactive: index === 0,
          bubblingMouseEvents: false,
        }).addTo(draftGroup)

        if (index === 0) {
          marker.bindTooltip('Cerrar polígono', { direction: 'top', offset: [0, -8] })
          marker.on('click', closePolygon)
        }
      })
    }

    const handleMapClick = (event: L.LeafletMouseEvent) => {
      if (!drawing) return
      points.push(event.latlng)
      redrawDraft()
    }

    const startDrawing = (event: Event, mode: DrawingMode) => {
      L.DomEvent.preventDefault(event)
      L.DomEvent.stopPropagation(event)
      drawingMode = mode
      draftGroup.clearLayers()
      points.length = 0
      if (map.doubleClickZoom.enabled()) {
        map.doubleClickZoom.disable()
        restoreDoubleClickZoom = true
      }
      setDrawing(true)
    }

    const startAreaDrawing = (event: Event) => startDrawing(event, 'area')
    const startVertexDrawing = (event: Event) => startDrawing(event, 'vertices')

    const cancelAndClear = () => {
      points.length = 0
      if (drawing) {
        finishDraft()
        return
      }
      completedGroup.clearLayers()
      publishPolygons()
    }

    const NativePolygonControl = L.Control.extend({
      options: { position: 'topright' as L.ControlPosition },
      onAdd() {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-draw-toolbar custom-polygon-control')
        drawButton = L.DomUtil.create('a', 'leaflet-draw-draw-polygon', container)
        drawButton.href = '#'
        drawButton.title = 'Dibujar polígono'
        drawButton.setAttribute('role', 'button')
        drawButton.setAttribute('aria-label', 'Dibujar polígono')
        vertexButton = L.DomUtil.create('a', 'custom-vertex-draw', container)
        vertexButton.href = '#'
        vertexButton.title = 'Selección por vértices y líneas rectas'
        vertexButton.setAttribute('role', 'button')
        vertexButton.setAttribute('aria-label', 'Selección por vértices y líneas rectas')
        vertexButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18 10 7l9 9"/><circle cx="5" cy="18" r="2"/><circle cx="10" cy="7" r="2"/><circle cx="19" cy="16" r="2"/></svg>'
        L.DomEvent.disableClickPropagation(container)
        L.DomEvent.on(drawButton, 'click', startAreaDrawing)
        L.DomEvent.on(vertexButton, 'click', startVertexDrawing)
        return container
      },
      onRemove() {
        if (drawButton) L.DomEvent.off(drawButton, 'click', startAreaDrawing)
        if (vertexButton) L.DomEvent.off(vertexButton, 'click', startVertexDrawing)
        drawButton = null
        vertexButton = null
      },
    })

    const nativePolygonControl = new NativePolygonControl()
    nativePolygonControl.addTo(map)

    L.drawLocal.edit.toolbar.actions.save.title = 'Guardar cambios'
    L.drawLocal.edit.toolbar.actions.save.text = 'Guardar'
    L.drawLocal.edit.toolbar.actions.cancel.title = 'Cancelar edición y descartar los cambios'
    L.drawLocal.edit.toolbar.actions.cancel.text = 'Cancelar'
    L.drawLocal.edit.toolbar.actions.clearAll.title = 'Eliminar todos los polígonos'
    L.drawLocal.edit.toolbar.actions.clearAll.text = 'Eliminar todo'
    L.drawLocal.edit.toolbar.buttons.edit = 'Editar polígono'
    L.drawLocal.edit.toolbar.buttons.editDisabled = 'No hay un polígono para editar'
    L.drawLocal.edit.toolbar.buttons.remove = 'Eliminar polígono'
    L.drawLocal.edit.toolbar.buttons.removeDisabled = 'No hay un polígono para eliminar'
    L.drawLocal.edit.handlers.edit.tooltip.text = 'Arrastra los vértices para editar el polígono.'
    L.drawLocal.edit.handlers.edit.tooltip.subtext = 'Pulsa Cancelar para deshacer los cambios.'
    L.drawLocal.edit.handlers.remove.tooltip.text = 'Haz clic en el polígono para eliminarlo.'

    const editControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polygon: false,
        polyline: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
      },
      edit: { featureGroup: completedGroup, remove: true },
    })
    editControl.addTo(map)

    map.on('click', handleMapClick)
    map.on(L.Draw.Event.EDITED, publishPolygons)
    map.on(L.Draw.Event.DELETED, publishPolygons)
    clearAllRef.current = cancelAndClear

    return () => {
      onDrawingChangeRef.current(false)
      map.off('click', handleMapClick)
      map.off(L.Draw.Event.EDITED, publishPolygons)
      map.off(L.Draw.Event.DELETED, publishPolygons)
      if (restoreDoubleClickZoom) map.doubleClickZoom.enable()
      map.removeControl(nativePolygonControl)
      map.removeControl(editControl)
      map.removeLayer(draftGroup)
      map.removeLayer(completedGroup)
      clearAllRef.current = () => undefined
    }
  }, [map])

  useEffect(() => {
    if (previousClearToken.current === clearToken) return
    previousClearToken.current = clearToken
    clearAllRef.current()
  }, [clearToken])

  return null
}
