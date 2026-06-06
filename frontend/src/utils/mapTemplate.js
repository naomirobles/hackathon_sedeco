// Paleta de colores para POIs dinámicos (CAPAS_POIs) — uno por tipo
const POI_COLOR_PALETTE = [
  '#E63946', '#2A9D8F', '#E9C46A', '#F4A261', '#264653',
  '#6A0572', '#0077B6', '#D62828', '#57CC99', '#F77F00',
  '#4361EE', '#7209B7', '#3A0CA3', '#560BAD', '#480CA8',
  '#B5179E', '#F72585', '#4CC9F0', '#06D6A0', '#FFB703',
];

const template = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Consulta Cartográfica — Exportación</title>
  <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
  <link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: "Segoe UI", system-ui, sans-serif;
           display: flex; flex-direction: column; height: 100vh; background: #f4f4f4; }
    header { background: #9F2241; color: white; padding: 12px 20px;
             display: flex; justify-content: space-between; align-items: center;
             box-shadow: 0 2px 6px rgba(0,0,0,0.25); flex-shrink: 0; }
    header h1 { margin: 0; font-size: 1.1rem; font-weight: 600; }
    header .export-date { font-size: 0.75rem; opacity: 0.8; }
    .container { display: flex; flex: 1; overflow: hidden; }
    #map { flex: 1; height: 100%; }
    #sidebar { width: 340px; background: white; border-left: 1px solid #e0e0e0;
               overflow-y: auto; padding: 14px 16px;
               box-shadow: -2px 0 8px rgba(0,0,0,0.06); }

    h2 { font-size: 0.85rem; font-weight: 700; color: #9F2241; letter-spacing: 0.04em;
         text-transform: uppercase; border-bottom: 2px solid #e8c9d0;
         padding-bottom: 5px; margin: 18px 0 10px; }
    h2:first-of-type { margin-top: 0; }

    /* Stats */
    .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 4px; }
    .stat-card { background: #fdf4f6; border: 1px solid #f0d0d8; border-radius: 8px;
                 padding: 10px 12px; }
    .stat-value { font-size: 1.35rem; font-weight: 800; color: #9F2241; line-height: 1.1; }
    .stat-label { font-size: 0.7rem; color: #888; text-transform: uppercase;
                  letter-spacing: 0.05em; margin-top: 3px; }

    /* Tabla resumen */
    table { width: 100%; border-collapse: collapse; font-size: 0.8rem; margin-top: 8px; }
    th { background: #9F2241; color: white; padding: 7px 9px; text-align: left; font-weight: 600; }
    td { padding: 6px 9px; border-bottom: 1px solid #f0f0f0; }
    tr:last-child td { border-bottom: none; font-weight: 700; background: #fafafa; }
    .falla { color: #c0392b; font-weight: 700; }

    /* Leyenda */
    .legend-section { margin-bottom: 4px; }
    .legend-section-title { font-size: 0.7rem; font-weight: 700; color: #777;
                            text-transform: uppercase; letter-spacing: 0.05em;
                            border-bottom: 1px solid #f0f0f0; padding-bottom: 4px;
                            margin-bottom: 6px; }
    .legend-item { display: flex; align-items: center; gap: 8px;
                   padding: 3px 2px; font-size: 0.78rem; color: #444; cursor: pointer;
                   border-radius: 4px; transition: background 0.15s; }
    .legend-item:hover { background: #f9f0f3; }
    .legend-item input[type=checkbox] { margin: 0; cursor: pointer; accent-color: #9F2241; }

    /* Rombo en leyenda */
    .diamond-icon { width: 14px; height: 14px; flex-shrink: 0;
                    transform: rotate(45deg); border-radius: 2px; }

    /* Círculo (cámaras) */
    .circle-icon { width: 12px; height: 12px; flex-shrink: 0;
                   border-radius: 50%; border: 2px solid rgba(0,0,0,0.2); }

    /* Polígono (capas área) */
    .poly-icon { width: 14px; height: 12px; flex-shrink: 0;
                 border-radius: 2px; opacity: 0.8; border: 1.5px solid rgba(0,0,0,0.3); }

    /* Línea dibujada */
    .line-icon { width: 20px; height: 3px; flex-shrink: 0;
                 border-radius: 2px; background: #9F2241; }

    .legend-count { font-size: 0.68rem; color: #aaa; margin-left: auto; }
    .no-data { font-size: 0.75rem; color: #bbb; font-style: italic; padding: 4px 2px; }
  </style>
</head>
<body>
  <header>
    <h1>Consulta Cartográfica — Ciudad de México</h1>
    <span class="export-date">Exportado: __EXPORT_DATE__</span>
  </header>

  <div class="container">
    <div id="map"></div>
    <div id="sidebar">
      <h2>Capas y Leyenda</h2>

      <div class="legend-section" id="section-pois" style="display:none">
        <div class="legend-section-title">Infraestructura (POIs)</div>
        <div id="poi-list"></div>
      </div>

      <div class="legend-section" id="section-polygons" style="display:none">
        <div class="legend-section-title">Límites administrativos</div>
        <div id="polygon-list"></div>
      </div>

      <div class="legend-section" id="section-drawings" style="display:none">
        <div class="legend-section-title">Dibujos y mediciones</div>
        <div id="drawing-list"></div>
      </div>

      <div class="legend-section" id="section-user-layers" style="display:none">
        <div class="legend-section-title">Capas del usuario</div>
        <div id="user-layers-list"></div>
      </div>

      <div class="legend-section" id="section-denue" style="display:none">
        <div class="legend-section-title">Unidades económicas (DENUE)</div>
        <div id="denue-list"></div>
      </div>
    </div>
  </div>

<script>
// ── Datos exportados ────────────────────────────────────────────────────────
const polygonsData   = __POLYGONS_DATA__;
const poisData       = __POIS_DATA__;
const userLayers     = __USER_LAYERS__;
const drawnPolygon   = __DRAWN_POLYGON__;
const denueData      = __DENUE_DATA__;
const denueColorMap  = __DENUE_COLOR_MAP__;
const layerColors    = __LAYER_COLORS__;
const layerFieldMap  = __LAYER_FIELD_MAP__;

// ── Paleta de colores para POIs dinámicos ──────────────────────────────────
const POI_PALETTE = [
  '#E63946','#2A9D8F','#E9C46A','#F4A261','#264653',
  '#6A0572','#0077B6','#D62828','#57CC99','#F77F00',
  '#4361EE','#7209B7','#3A0CA3','#560BAD','#480CA8',
  '#B5179E','#F72585','#4CC9F0','#06D6A0','#FFB703',
];

// Asigna un color fijo a cada tipo de POI (persistente en esta sesión)
const poiTypeColors = {};
let paletteIdx = 0;
function colorForPoiType(type) {
  if (!poiTypeColors[type]) {
    poiTypeColors[type] = POI_PALETTE[paletteIdx % POI_PALETTE.length];
    paletteIdx++;
  }
  return poiTypeColors[type];
}

// ── Inicializar mapa ────────────────────────────────────────────────────────
const map = new maplibregl.Map({
  container: 'map',
  style: '__MAP_STYLE_URL__',
  center: [__LNG__, __LAT__],
  zoom: __ZOOM__,
});
map.addControl(new maplibregl.NavigationControl(), 'top-right');
map.addControl(new maplibregl.ScaleControl(), 'bottom-left');

// ── Helper: crear imagen de rombo en canvas ─────────────────────────────────
function createDiamondImage(color, size = 32) {
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const half = size / 2;
  const pad  = 3;
  ctx.save();
  ctx.translate(half, half);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = color;
  const s = (half - pad) * Math.SQRT2;
  ctx.fillRect(-s / 2, -s / 2, s, s);
  // borde blanco
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.strokeRect(-s / 2, -s / 2, s, s);
  ctx.restore();
  const imageData = ctx.getImageData(0, 0, size, size);
  return { width: size, height: size, data: imageData.data };
}

// Registra una imagen de rombo para el mapa
function ensureDiamondImage(color) {
  const id = 'diamond-' + color.replace('#', '');
  if (!map.hasImage(id)) {
    map.addImage(id, createDiamondImage(color, 32));
  }
  return id;
}

// ── Track de capas visibles (para toggle desde leyenda) ─────────────────────
const activePoiTypes = new Set();  // tipos de POI activos

function updatePoiSource(type) {
  // filtra el GeoJSON de ese tipo y actualiza la source
  const src = map.getSource('source-poi-dyn-' + sanitize(type));
  if (!src) return;
  const geojson = poisData['CAPAS_POIs'] || { type: 'FeatureCollection', features: [] };
  const features = geojson.features.filter(f =>
    (f.properties.POI || '').toUpperCase() === type.toUpperCase()
  );
  src.setData({ type: 'FeatureCollection', features });
}

function sanitize(str) {
  return str.replace(/[^a-zA-Z0-9]/g, '_');
}

// ── Crear entrada de leyenda genérica ───────────────────────────────────────
function makeLegendItem({ iconEl, label, count, onToggle, checked = true }) {
  const item = document.createElement('div');
  item.className = 'legend-item';

  const cb = document.createElement('input');
  cb.type = 'checkbox'; cb.checked = checked;
  if (onToggle) cb.addEventListener('change', () => onToggle(cb.checked));

  const labelEl = document.createElement('span');
  labelEl.textContent = label;
  labelEl.style.flex = '1';

  item.appendChild(cb);
  item.appendChild(iconEl);
  item.appendChild(labelEl);

  if (count !== undefined) {
    const cnt = document.createElement('span');
    cnt.className = 'legend-count';
    cnt.textContent = '(' + count + ')';
    item.appendChild(cnt);
  }
  return item;
}

function diamondLegendIcon(color) {
  const el = document.createElement('div');
  el.className = 'diamond-icon';
  el.style.background = color;
  return el;
}
function circleLegendIcon(color) {
  const el = document.createElement('div');
  el.className = 'circle-icon';
  el.style.background = color;
  el.style.borderColor = color;
  return el;
}
function polyLegendIcon(color) {
  const el = document.createElement('div');
  el.className = 'poly-icon';
  el.style.background = color + '55';
  el.style.borderColor = color;
  return el;
}
function lineLegendIcon() {
  const el = document.createElement('div');
  el.className = 'line-icon';
  return el;
}
function coloredLineLegendIcon(color) {
  const el = document.createElement('div');
  el.className = 'line-icon';
  el.style.background = color;
  return el;
}
function heatmapLegendIcon() {
  const el = document.createElement('div');
  el.style.cssText = 'width:20px;height:12px;flex-shrink:0;border-radius:2px;border:1px solid #ccc;background:linear-gradient(to right,rgba(33,102,172,0.1),rgb(103,169,207),rgb(239,138,98),rgb(178,24,43));';
  return el;
}

// ── map.on('load') ───────────────────────────────────────────────────────────
map.on('load', () => {

  // ── 1. POIs ─────────────────────────────────────────────────────────────────
  const poiList = document.getElementById('poi-list');
  let hasPois = false;

  // 2a. CAPAS_POIs — puntos dinámicos, renderizados como rombos
  if (poisData['CAPAS_POIs'] && poisData['CAPAS_POIs'].features && poisData['CAPAS_POIs'].features.length > 0) {
    const dynFeatures = poisData['CAPAS_POIs'].features;

    // Agrupar por tipo de POI
    const byType = {};
    dynFeatures.forEach(f => {
      const t = (f.properties.POI || 'SIN TIPO').toUpperCase();
      if (!byType[t]) byType[t] = [];
      byType[t].push(f);
    });

    Object.entries(byType).forEach(([type, features]) => {
      const color   = colorForPoiType(type);
      const imgId   = ensureDiamondImage(color);
      const srcId   = 'source-poi-dyn-' + sanitize(type);
      const lyrId   = 'layer-poi-dyn-' + sanitize(type);

      const geojson = { type: 'FeatureCollection', features };

      // Decidir si renderizar como símbolo (punto) o polígono según geometría
      const firstGeomType = features[0]?.geometry?.type || 'Point';
      const isPoint = firstGeomType === 'Point';

      map.addSource(srcId, { type: 'geojson', data: geojson });

      if (isPoint) {
        map.addLayer({
          id: lyrId,
          type: 'symbol',
          source: srcId,
          layout: {
            'icon-image': imgId,
            'icon-size': 0.7,
            'icon-allow-overlap': true,
            'icon-ignore-placement': false,
          },
        });
      } else {
        // Polígono (algunos POIs como mercados o panteones vienen de CAPAS_POIs como polígono)
        map.addLayer({ id: lyrId + '-fill', type: 'fill', source: srcId,
          paint: { 'fill-color': color, 'fill-opacity': 0.35 } });
        map.addLayer({ id: lyrId + '-line', type: 'line', source: srcId,
          paint: { 'line-color': color, 'line-width': 1.5 } });
      }

      activePoiTypes.add(type);
      hasPois = true;

      // Popup POI
      const clickLayerId = isPoint ? lyrId : lyrId + '-fill';
      map.on('click', clickLayerId, e => {
        const props = e.features[0].properties;
        const coords = e.lngLat;
        let html = '<div style="font-size:12px;min-width:180px"><div style="background:' + color + ';color:#fff;padding:6px 10px;margin:-7px -7px 6px;border-radius:4px 4px 0 0;font-weight:700">' + type + '</div>';
        Object.entries(props).filter(([,v]) => v !== null && v !== '' && v !== undefined).forEach(([k,v]) => {
          html += '<div><b>' + k.split('_').pop().toUpperCase() + ':</b> ' + String(v).toUpperCase() + '</div>';
        });
        html += '</div>';
        new maplibregl.Popup({ offset: 10 }).setLngLat([coords.lng, coords.lat]).setHTML(html).addTo(map);
      });
      map.on('mouseenter', clickLayerId, () => map.getCanvas().style.cursor = 'pointer');
      map.on('mouseleave', clickLayerId, () => map.getCanvas().style.cursor = '');

      // Leyenda
      const item = makeLegendItem({
        iconEl: diamondLegendIcon(color),
        label: type,
        count: features.length,
        onToggle: visible => {
          const vis = visible ? 'visible' : 'none';
          if (isPoint) {
            if (map.getLayer(lyrId)) map.setLayoutProperty(lyrId, 'visibility', vis);
          } else {
            if (map.getLayer(lyrId + '-fill')) map.setLayoutProperty(lyrId + '-fill', 'visibility', vis);
            if (map.getLayer(lyrId + '-line')) map.setLayoutProperty(lyrId + '-line', 'visibility', vis);
          }
        },
      });
      poiList.appendChild(item);
    });
  }

  // 2b. Capas POI estáticas (Mercados, Panteones, Media_Superior) — polígonos
  const staticPoiKeys = Object.keys(poisData).filter(k => k !== 'CAPAS_POIs');
  staticPoiKeys.forEach(type => {
    const geojson = poisData[type];
    if (!geojson || !geojson.features || geojson.features.length === 0) return;

    const color  = layerColors[type] || colorForPoiType(type);
    const srcId  = 'source-poi-static-' + sanitize(type);
    const lyrFill = 'layer-poi-static-' + sanitize(type) + '-fill';
    const lyrLine = 'layer-poi-static-' + sanitize(type) + '-line';

    map.addSource(srcId, { type: 'geojson', data: geojson });
    map.addLayer({ id: lyrFill, type: 'fill', source: srcId,
      paint: { 'fill-color': color, 'fill-opacity': 0.35 } });
    map.addLayer({ id: lyrLine, type: 'line', source: srcId,
      paint: { 'line-color': color, 'line-width': 1.5 } });

    hasPois = true;

    // Popup
    map.on('click', lyrFill, e => {
      const props = e.features[0].properties;
      const coords = e.lngLat;
      const nombre = props.NOMBRE_POI || layerFieldMap[type]?.label || type;
      let html = '<div style="font-size:12px;min-width:180px"><div style="background:' + color + ';color:#fff;padding:6px 10px;margin:-7px -7px 6px;border-radius:4px 4px 0 0;font-weight:700">' + nombre + '</div>';
      Object.entries(props).filter(([,v]) => v !== null && v !== '').forEach(([k,v]) => {
        html += '<div><b>' + k.split('_').pop().toUpperCase() + ':</b> ' + String(v).toUpperCase() + '</div>';
      });
      html += '</div>';
      new maplibregl.Popup({ offset: 10 }).setLngLat([coords.lng, coords.lat]).setHTML(html).addTo(map);
    });
    map.on('mouseenter', lyrFill, () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', lyrFill, () => map.getCanvas().style.cursor = '');

    // Leyenda con ícono de polígono (rombo relleno sólido para diferenciarlo)
    const item = makeLegendItem({
      iconEl: polyLegendIcon(color),
      label: layerFieldMap[type]?.label || type,
      count: geojson.features.length,
      onToggle: visible => {
        const vis = visible ? 'visible' : 'none';
        if (map.getLayer(lyrFill)) map.setLayoutProperty(lyrFill, 'visibility', vis);
        if (map.getLayer(lyrLine)) map.setLayoutProperty(lyrLine, 'visibility', vis);
      },
    });
    poiList.appendChild(item);
  });

  if (hasPois) document.getElementById('section-pois').style.display = '';

  // ── 3. POLÍGONOS ADMINISTRATIVOS ───────────────────────────────────────────
  const polygonList = document.getElementById('polygon-list');
  let hasPolygons = false;

  Object.entries(polygonsData).forEach(([layerId, geojson]) => {
    if (!geojson || !geojson.features || geojson.features.length === 0) return;
    const color  = layerColors[layerId] || '#888';
    const srcId  = 'source-admin-' + sanitize(layerId);
    const lyrFill = 'layer-admin-' + sanitize(layerId) + '-fill';
    const lyrLine = 'layer-admin-' + sanitize(layerId) + '-line';

    map.addSource(srcId, { type: 'geojson', data: geojson });
    map.addLayer({ id: lyrFill, type: 'fill', source: srcId,
      paint: { 'fill-color': color, 'fill-opacity': 0.08 } });
    map.addLayer({ id: lyrLine, type: 'line', source: srcId,
      paint: { 'line-color': color, 'line-width': 2, 'line-opacity': 0.9 } });

    hasPolygons = true;

    const item = makeLegendItem({
      iconEl: polyLegendIcon(color),
      label: layerFieldMap[layerId]?.label || layerId,
      onToggle: visible => {
        const vis = visible ? 'visible' : 'none';
        if (map.getLayer(lyrFill)) map.setLayoutProperty(lyrFill, 'visibility', vis);
        if (map.getLayer(lyrLine)) map.setLayoutProperty(lyrLine, 'visibility', vis);
      },
    });
    polygonList.appendChild(item);
  });

  if (hasPolygons) document.getElementById('section-polygons').style.display = '';

  // ── 4. POLÍGONOS DIBUJADOS ─────────────────────────────────────────────────
  const drawingList = document.getElementById('drawing-list');

  if (drawnPolygon && drawnPolygon.features && drawnPolygon.features.length > 0) {
    map.addSource('source-drawn', { type: 'geojson', data: drawnPolygon });

    map.addLayer({ id: 'drawn-fill', type: 'fill', source: 'source-drawn',
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: { 'fill-color': '#9F2241', 'fill-opacity': 0.12 } });

    map.addLayer({ id: 'drawn-line', type: 'line', source: 'source-drawn',
      paint: { 'line-color': '#9F2241', 'line-width': 2.5,
               'line-dasharray': [3, 1.5] } });

    map.addLayer({ id: 'drawn-label', type: 'symbol', source: 'source-drawn',
      layout: {
        'text-field': ['coalesce', ['get', 'nombre'], ''],
        'text-size': 12,
        'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
        'text-radial-offset': 0.5,
        'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
      },
      paint: { 'text-color': '#9F2241', 'text-halo-color': '#fff', 'text-halo-width': 2 },
    });

    drawnPolygon.features.forEach((f, idx) => {
      const nombre = f.properties.nombre || ('Dibujo ' + (idx + 1));
      const item = makeLegendItem({ iconEl: lineLegendIcon(), label: nombre });
      drawingList.appendChild(item);
    });

    document.getElementById('section-drawings').style.display = '';
  }

  // ── 5. CAPAS DEL USUARIO ──────────────────────────────────────────────────
  const USER_PALETTE = [
    '#FF6B35', '#7B2D8B', '#00B4D8', '#06D6A0', '#FFB703',
    '#FB8500', '#023E8A', '#40916C', '#C77DFF', '#E63946',
    '#3A86FF', '#8338EC', '#FF006E', '#FFBE0B', '#2DC653',
  ];

  const userLayersList = document.getElementById('user-layers-list');
  let hasUserLayers = false;

  userLayers.forEach((layer, idx) => {
    if (!layer.data || !layer.data.features || layer.data.features.length === 0) return;

    const color  = USER_PALETTE[idx % USER_PALETTE.length];
    const srcId  = 'source-user-' + idx;
    const geomTypes = new Set(
      layer.data.features.map(f => f.geometry && f.geometry.type).filter(Boolean)
    );
    const addedLayerIds = [];

    map.addSource(srcId, { type: 'geojson', data: layer.data });

    // ── Heatmap para capas externas (portales CKAN) ─────────────────────────
    if (layer.isExternal) {
      const lyrId = 'layer-user-' + idx + '-heat';
      map.addLayer({
        id: lyrId,
        type: 'heatmap',
        source: srcId,
        paint: {
          'heatmap-weight': 1,
          'heatmap-intensity': 1,
          'heatmap-radius': 20,
          'heatmap-opacity': 0.8,
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0,   'rgba(33,102,172,0)',
            0.2, 'rgb(103,169,207)',
            0.4, 'rgb(209,229,240)',
            0.6, 'rgb(253,219,199)',
            0.8, 'rgb(239,138,98)',
            1,   'rgb(178,24,43)'
          ],
        },
      });
      addedLayerIds.push(lyrId);

      const displayName = layer.name.length > 28 ? layer.name.substring(0, 28) + '…' : layer.name;
      const item = makeLegendItem({
        iconEl: heatmapLegendIcon(),
        label: displayName,
        count: layer.data.features.length,
        onToggle: visible => {
          if (map.getLayer(lyrId)) map.setLayoutProperty(lyrId, 'visibility', visible ? 'visible' : 'none');
        },
      });
      userLayersList.appendChild(item);
      hasUserLayers = true;
      return;
    }

    // ── Capas normales: puntos, polígonos, líneas ───────────────────────────
    // Puntos
    if (geomTypes.has('Point') || geomTypes.has('MultiPoint')) {
      const lyrId = 'layer-user-' + idx + '-point';
      map.addLayer({
        id: lyrId,
        type: 'circle',
        source: srcId,
        filter: ['in', ['geometry-type'], ['literal', ['Point', 'MultiPoint']]],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 4, 15, 8, 18, 12],
          'circle-color': color,
          'circle-opacity': 0.85,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
        },
      });
      addedLayerIds.push(lyrId);
      map.on('click', lyrId, e => {
        const props = e.features[0].properties;
        const coords = e.features[0].geometry.coordinates.slice();
        let html = '<div style="font-size:12px;min-width:180px"><div style="background:' + color + ';color:#fff;padding:6px 10px;margin:-7px -7px 6px;border-radius:4px 4px 0 0;font-weight:700">' + layer.name + '</div>';
        Object.entries(props).filter(([,v]) => v !== null && v !== '' && v !== undefined)
          .forEach(([k,v]) => { html += '<div><b>' + k + ':</b> ' + String(v) + '</div>'; });
        html += '</div>';
        new maplibregl.Popup({ offset: 10 }).setLngLat(coords).setHTML(html).addTo(map);
      });
      map.on('mouseenter', lyrId, () => map.getCanvas().style.cursor = 'pointer');
      map.on('mouseleave', lyrId, () => map.getCanvas().style.cursor = '');
    }

    // Polígonos
    if (geomTypes.has('Polygon') || geomTypes.has('MultiPolygon')) {
      const lyrFill = 'layer-user-' + idx + '-fill';
      const lyrLine = 'layer-user-' + idx + '-poly-line';
      map.addLayer({
        id: lyrFill,
        type: 'fill',
        source: srcId,
        filter: ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]],
        paint: { 'fill-color': color, 'fill-opacity': 0.35 },
      });
      map.addLayer({
        id: lyrLine,
        type: 'line',
        source: srcId,
        filter: ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]],
        paint: { 'line-color': color, 'line-width': 2 },
      });
      addedLayerIds.push(lyrFill, lyrLine);
      map.on('click', lyrFill, e => {
        const props = e.features[0].properties;
        let html = '<div style="font-size:12px;min-width:180px"><div style="background:' + color + ';color:#fff;padding:6px 10px;margin:-7px -7px 6px;border-radius:4px 4px 0 0;font-weight:700">' + layer.name + '</div>';
        Object.entries(props).filter(([,v]) => v !== null && v !== '' && v !== undefined)
          .forEach(([k,v]) => { html += '<div><b>' + k + ':</b> ' + String(v) + '</div>'; });
        html += '</div>';
        new maplibregl.Popup({ offset: 10 }).setLngLat([e.lngLat.lng, e.lngLat.lat]).setHTML(html).addTo(map);
      });
      map.on('mouseenter', lyrFill, () => map.getCanvas().style.cursor = 'pointer');
      map.on('mouseleave', lyrFill, () => map.getCanvas().style.cursor = '');
    }

    // Líneas
    if (geomTypes.has('LineString') || geomTypes.has('MultiLineString')) {
      const lyrId = 'layer-user-' + idx + '-line';
      map.addLayer({
        id: lyrId,
        type: 'line',
        source: srcId,
        filter: ['in', ['geometry-type'], ['literal', ['LineString', 'MultiLineString']]],
        paint: { 'line-color': color, 'line-width': 2.5 },
      });
      addedLayerIds.push(lyrId);
    }

    if (addedLayerIds.length === 0) return; // geometría no soportada

    hasUserLayers = true;

    // Ícono de leyenda según geometría dominante
    let iconEl;
    if (geomTypes.has('Point') || geomTypes.has('MultiPoint')) {
      iconEl = circleLegendIcon(color);
    } else if (geomTypes.has('LineString') || geomTypes.has('MultiLineString')) {
      iconEl = coloredLineLegendIcon(color);
    } else {
      iconEl = polyLegendIcon(color);
    }

    const displayName = layer.name.length > 28 ? layer.name.substring(0, 28) + '…' : layer.name;
    const item = makeLegendItem({
      iconEl,
      label: displayName,
      count: layer.data.features.length,
      onToggle: visible => {
        const vis = visible ? 'visible' : 'none';
        addedLayerIds.forEach(id => {
          if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis);
        });
      },
    });
    userLayersList.appendChild(item);
  });

  if (hasUserLayers) document.getElementById('section-user-layers').style.display = '';

  // ── 6. DENUE ──────────────────────────────────────────────────────────────
  if (denueData && denueData.features && denueData.features.length > 0) {
    const denueCats = Object.keys(denueColorMap);

    // Expresión de color por categoría para MapLibre
    let denueColorExpr;
    if (denueCats.length > 0) {
      denueColorExpr = ['match', ['get', 'nombre_act']];
      denueCats.forEach(cat => { denueColorExpr.push(cat, denueColorMap[cat]); });
      denueColorExpr.push('#aaaaaa');
    } else {
      denueColorExpr = '#9F2241';
    }

    map.addSource('source-denue', { type: 'geojson', data: denueData });
    map.addLayer({
      id: 'layer-denue-points',
      type: 'circle',
      source: 'source-denue',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3, 15, 7],
        'circle-color': denueColorExpr,
        'circle-opacity': 0.85,
        'circle-stroke-width': 0.8,
        'circle-stroke-color': '#ffffff',
      },
    });

    // Popup al hacer clic en un punto DENUE
    const DENUE_LABELS = {
      nom_estab:  'Establecimiento',
      codigo_act: 'Código de actividad',
      nombre_act: 'Actividad',
      per_ocu:    'Personal ocupado',
      tipoUniEco: 'Tipo de unidad económica',
      sector:     'Sector',
    };
    map.on('click', 'layer-denue-points', e => {
      const props  = e.features[0].properties;
      const coords = e.lngLat;
      const color  = denueColorMap[props.nombre_act] || '#9F2241';

      let html = '<div style="font-size:12px;min-width:210px;max-width:280px;font-family:system-ui,sans-serif">';
      html += '<div style="background:' + color + ';color:#fff;padding:8px 12px;margin:-7px -7px 8px;border-radius:4px 4px 0 0">';
      html += '<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;opacity:0.85">DENUE — Unidad Económica</div>';
      html += '<div style="font-size:13px;font-weight:700;margin-top:2px">' + (props.nombre_act || '—') + '</div></div>';

      Object.entries(DENUE_LABELS).forEach(([key, label]) => {
        const val = props[key];
        if (val === null || val === undefined || String(val).trim() === '') return;
        html += '<div style="padding:5px 4px;border-bottom:1px solid #f1f5f9">';
        html += '<div style="font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.04em">' + label + '</div>';
        html += '<div style="font-size:12px;color:#1e293b;margin-top:1px">' + String(val) + '</div></div>';
      });
      html += '</div>';

      new maplibregl.Popup({ offset: 10 }).setLngLat([coords.lng, coords.lat]).setHTML(html).addTo(map);
    });
    map.on('mouseenter', 'layer-denue-points', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'layer-denue-points', () => map.getCanvas().style.cursor = '');

    // Leyenda DENUE — toggle global + top categorías
    const denueList = document.getElementById('denue-list');

    // Conteo por categoría
    const denueByCat = {};
    denueData.features.forEach(f => {
      const cat = f.properties.nombre_act || 'Sin categoría';
      denueByCat[cat] = (denueByCat[cat] || 0) + 1;
    });
    const sortedDenue = Object.entries(denueByCat).sort((a, b) => b[1] - a[1]);

    // Nota de totales
    const totalEl = document.createElement('div');
    totalEl.style.cssText = 'font-size:11px;color:#64748b;margin-bottom:6px;padding:2px 0';
    totalEl.textContent = denueData.features.length.toLocaleString() + ' unidades · ' + sortedDenue.length + ' categorías';
    denueList.appendChild(totalEl);

    // Toggle master para mostrar/ocultar toda la capa
    const masterItem = makeLegendItem({
      iconEl: circleLegendIcon('#9F2241'),
      label: 'Puntos DENUE (todos)',
      count: denueData.features.length,
      onToggle: visible => {
        if (map.getLayer('layer-denue-points')) {
          map.setLayoutProperty('layer-denue-points', 'visibility', visible ? 'visible' : 'none');
        }
      },
    });
    denueList.appendChild(masterItem);

    // Top 8 categorías como referencia visual
    sortedDenue.slice(0, 8).forEach(([cat, count]) => {
      const color = denueColorMap[cat] || '#aaa';
      const itemEl = document.createElement('div');
      itemEl.style.cssText = 'display:flex;align-items:center;gap:7px;padding:3px 2px 3px 20px;font-size:0.75rem;color:#475569';
      const dot = document.createElement('span');
      dot.style.cssText = 'width:9px;height:9px;border-radius:50%;flex-shrink:0;background:' + color;
      const lbl = document.createElement('span');
      lbl.style.flex = '1';
      lbl.textContent = cat.length > 30 ? cat.slice(0, 30) + '…' : cat;
      const cnt = document.createElement('span');
      cnt.style.cssText = 'font-size:0.68rem;color:#aaa';
      cnt.textContent = '(' + count + ')';
      itemEl.appendChild(dot);
      itemEl.appendChild(lbl);
      itemEl.appendChild(cnt);
      denueList.appendChild(itemEl);
    });

    if (sortedDenue.length > 8) {
      const moreEl = document.createElement('div');
      moreEl.style.cssText = 'font-size:10px;color:#94a3b8;font-style:italic;padding:3px 2px 3px 20px';
      moreEl.textContent = '+' + (sortedDenue.length - 8) + ' categorías más';
      denueList.appendChild(moreEl);
    }

    document.getElementById('section-denue').style.display = '';
  }

}); // end map.on('load')
</script>
</body>
</html>`;

export default template;