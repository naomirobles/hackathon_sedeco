import { LAYER_COLORS, LAYER_FIELD_MAP, MAP_STYLES } from '../constants';
import template from './mapTemplate';

export function downloadMapHTML({
  polygonsData,
  poisData,
  userLayers,
  drawnPolygon,
  mapStyle,
  viewState,
  denueData,
  denueColorMap,
}) {
  const mapStyleUrl = MAP_STYLES.find(s => s.id === mapStyle)?.url ?? MAP_STYLES[0].url;

  // Normalizar drawnPolygon: siempre un FeatureCollection o null
  let normalizedDrawn = null;
  if (drawnPolygon) {
    if (typeof drawnPolygon === 'string') {
      try { normalizedDrawn = JSON.parse(drawnPolygon); } catch { normalizedDrawn = null; }
    } else {
      normalizedDrawn = drawnPolygon;
    }
    // Si viene como Feature individual (no FeatureCollection), envolverlo
    if (normalizedDrawn && normalizedDrawn.type === 'Feature') {
      normalizedDrawn = { type: 'FeatureCollection', features: [normalizedDrawn] };
    }
  }

  const safePolygonsData  = JSON.stringify(polygonsData  || {});
  const safePoisData      = JSON.stringify(poisData      || {});
  const safeUserLayers    = JSON.stringify(userLayers    || []);
  const safeDrawnPolygon  = JSON.stringify(normalizedDrawn);
  const safeDenueData     = JSON.stringify(denueData     || null);
  const safeDenueColorMap = JSON.stringify(denueColorMap || {});

  const htmlContent = template
    .replace('__EXPORT_DATE__',       new Date().toLocaleString('es-MX'))
    .replace('__POLYGONS_DATA__',     safePolygonsData)
    .replace('__POIS_DATA__',         safePoisData)
    .replace('__USER_LAYERS__',       safeUserLayers)
    .replace('__DRAWN_POLYGON__',     safeDrawnPolygon)
    .replace('__DENUE_DATA__',        safeDenueData)
    .replace('__DENUE_COLOR_MAP__',   safeDenueColorMap)
    .replace('__LAYER_COLORS__',      JSON.stringify(LAYER_COLORS))
    .replace('__LAYER_FIELD_MAP__',   JSON.stringify(LAYER_FIELD_MAP))
    .replace('__MAP_STYLE_URL__',     mapStyleUrl)
    .replace('__LNG__',               viewState.longitude.toString())
    .replace('__LAT__',               viewState.latitude.toString())
    .replace('__ZOOM__',              viewState.zoom.toString());

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = 'mapa_consulta_' + new Date().toISOString().split('T')[0] + '.html';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}