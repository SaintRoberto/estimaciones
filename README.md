# GeoCenso Ecuador

Visor geográfico para consultar edificaciones censales y población de sectores censales intersectados por un polígono dibujado sobre OpenStreetMap.

## Ejecutar localmente

Requiere Node.js 20.19 o superior (también compatible con Node.js 22.12+).

```bash
npm install
npm run dev
```

Abre la dirección local que muestra Vite (normalmente `http://localhost:5173`). Para generar la versión de producción:

```bash
npm run build
npm run preview
```

## Fuentes

- Edificaciones censales 2022: servicio ArcGIS oficial del INEC.
- Población 2022: capa pública externa de ArcGIS basada en datos censales del INEC. La consulta suma la población completa de cada sector censal intersectado; no estima la población exacta dentro del polígono.
- Geocodificación: Photon sobre datos de OpenStreetMap.
- Cartografía base: OpenStreetMap.

## Módulo de Monitoreo de Tormentas

La ruta `/tormentas` integra imágenes GOES-East GeoColor de NASA GIBS, flashes ópticos GOES-19 GLM de NOAA y pronósticos de Open-Meteo. La capa GLM necesita desplegar la función Python de `api/lightning.py` en una plataforma serverless compatible con Vercel; sus dependencias están declaradas en `requirements.txt`.

Los datos GLM representan flashes ópticos detectados por el instrumento y no descargas nube-tierra confirmadas. El pronóstico de Open-Meteo se presenta por separado de las observaciones satelitales.
