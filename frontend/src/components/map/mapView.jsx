import React, { useCallback } from 'react';
import Map, { Popup, NavigationControl, ScaleControl, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

import DrawControl    from './drawControl';
import PolygonLayers  from './layers/PolygonLayers';
import CustomMarkerLayer from './layers/CustomMarkerLayer';
import PoisLayer from './layers/POISLayers';
import DenueLayer from './layers/DenueLayer';

import { MAP_STYLES, LAYER_COLORS } from '../../constants';
import styles from '../../styles';

// Iconos POIs
import cablebusIcon    from '../../../assets/pois/cablebus.png';
import cetramIcon      from '../../../assets/pois/cetram.png';
import comercioIcon    from '../../../assets/pois/comercio.svg';
import comunidadIcon   from '../../../assets/pois/comunidad.svg';
import ecobiciIcon     from '../../../assets/pois/ecobici.png';
import educacionIcon   from '../../../assets/pois/educacion.svg';
import eventosIcon     from '../../../assets/pois/eventos.svg';
import gobiernoIcon    from '../../../assets/pois/gobieno_servicios_publicos.svg';
import metroIcon       from '../../../assets/pois/metro.png';
import metrobusIcon    from '../../../assets/pois/metrobus.png';
import saludIcon       from '../../../assets/pois/salud.svg';
import seguridadIcon   from '../../../assets/pois/seguridad_emergencias.svg';
import serviciosIcon   from '../../../assets/pois/servicios.svg';
import transporteIcon  from '../../../assets/pois/transporte.svg';
import trenIcon        from '../../../assets/pois/tren_ligero.png';
import trolebusIcon    from '../../../assets/pois/trolebus.png';
import verificentroIcon from '../../../assets/pois/verificentro.png';

const POI_ICONS = [
  { id: 'cablebus',    url: cablebusIcon,    type: 'png' },
  { id: 'cetram',      url: cetramIcon,      type: 'png' },
  { id: 'comercio',    url: comercioIcon,    type: 'svg' },
  { id: 'comunidad',   url: comunidadIcon,   type: 'svg' },
  { id: 'ecobici',     url: ecobiciIcon,     type: 'png' },
  { id: 'educacion',   url: educacionIcon,   type: 'svg' },
  { id: 'eventos',     url: eventosIcon,     type: 'svg' },
  { id: 'gobierno',    url: gobiernoIcon,    type: 'svg' },
  { id: 'metro',       url: metroIcon,       type: 'png' },
  { id: 'metrobus',    url: metrobusIcon,    type: 'png' },
  { id: 'salud',       url: saludIcon,       type: 'svg' },
  { id: 'seguridad',   url: seguridadIcon,   type: 'svg' },
  { id: 'servicios',   url: serviciosIcon,   type: 'svg' },
  { id: 'transporte',  url: transporteIcon,  type: 'svg' },
  { id: 'tren_ligero', url: trenIcon,        type: 'png' },
  { id: 'trolebus',    url: trolebusIcon,    type: 'png' },
  { id: 'verificentro',url: verificentroIcon,type: 'png' },
];

// ── Estilos del control de dibujo ──────────────────────────────────────────
const DRAW_STYLES = [
  {
    id: 'gl-draw-polygon-fill',
    type: 'fill',
    filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
    paint: { 'fill-color': '#9F2241', 'fill-opacity': 0.1 },
  },
  {
    id: 'gl-draw-polygon-stroke-active',
    type: 'line',
    filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
    paint: { 'line-color': '#9F2241', 'line-width': 2 },
  },
  {
    id: 'gl-draw-line-active',
    type: 'line',
    filter: ['all', ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
    paint: { 'line-color': '#9F2241', 'line-width': 2 },
  },
  {
    id: 'gl-draw-polygon-label',
    type: 'symbol',
    filter: ['all', ['has', 'user_nombre'], ['any', ['==', '$type', 'Polygon'], ['==', '$type', 'LineString']]],
    layout: {
      'text-field': ['get', 'user_nombre'],
      'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
      'text-radial-offset': 0.5,
      'text-justify': 'auto',
      'text-size': 12,
      'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular', 'sans-serif']
    },
    paint: {
      'text-color': '#9F2241',
      'text-halo-color': '#ffffff',
      'text-halo-width': 2
    }
  },
  {
    id: 'gl-draw-vertex-active',
    type: 'circle',
    filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
    paint: { 'circle-radius': 5, 'circle-color': '#ffffff', 'circle-stroke-width': 2, 'circle-stroke-color': '#9F2241' },
  },
  {
    id: 'gl-draw-polygon-midpoint',
    type: 'circle',
    filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
    paint: { 'circle-radius': 4, 'circle-color': '#9F2241' },
  },
  {
    id: 'gl-draw-point-active',
    type: 'circle',
    filter: ['all', ['==', '$type', 'Point'], ['!=', 'meta', 'vertex'], ['!=', 'mode', 'static']],
    paint: { 'circle-radius': 6, 'circle-color': '#9F2241' },
  },
];
const tam = 64;
const DENUE_FIELD_LABELS = {
  nom_estab:  'Establecimiento',
  codigo_act: 'Código de actividad',
  nombre_act: 'Actividad',
  per_ocu:    'Personal ocupado',
  tipoUniEco: 'Tipo de unidad económica',
  sector:     'Sector',
};

export default function MapView({
  viewState,
  onMove,
  onMouseMove,
  onClick,
  mapStyle,
  cursor,
  userLayers,
  polygonsData,
  poisData,
  denueData,
  denueColorMap,
  denueVisible,
  denuePopup,
  onCloseDenuePopup,
  customMarker,
  circlePreview,
  circleCenterMarker,
  isDrawActive,
  measureMode,
  setDrawInstance,
  onCreatePolygon,
  onUpdatePolygon,
  onDeletePolygon,
  onSelectionChange,
  polyPopup,
  onClosePolyPopup,
}) {
  const mapStyleUrl = MAP_STYLES.find(s => s.id === mapStyle)?.url ?? MAP_STYLES[0].url;

  // ── Helper: carga SVG via fetch → canvas → ImageData → map.addImage ──────
  const loadSvgAsImage = (map, id, url) => {
    return new Promise((resolve) => {
      fetch(url)
        .then(res => res.text())
        .then(svgText => {
          // Estos SVGs usan: clipPath con rect desplazado + transform="translate(...)"
          // El contenido real vive en coordenadas 0,0 -> w,h del clipPath rect.
          // Fix: viewBox="0 0 w h" + eliminar clip-path y translate del <g>.
          const clipMatch = svgText.match(/rect x="[\d.]+" y="[\d.]+" width="([\d.]+)" height="([\d.]+)"/);

          let svgNormalizado;
          if (clipMatch) {
            const w = clipMatch[1];
            const h = clipMatch[2];
            svgNormalizado = svgText
              .replace(/\bwidth="[^"]*"/, 'width="128"')
              .replace(/\bheight="[^"]*"/, 'height="128"')
              .replace(/<svg /, '<svg viewBox="0 0 ' + w + ' ' + h + '" ')
              .replace(/ clip-path="url\(#[^"]*\)"/, '')
              .replace(/ transform="translate\([^"]*\)"/, '');
          } else {
            // SVG con coordenadas normales — solo forzar dimensiones
            svgNormalizado = svgText
              .replace(/\bwidth="[^"]*"/, 'width="128"')
              .replace(/\bheight="[^"]*"/, 'height="128"');
          }

          // Colorear SVGs de FontAwesome: reemplazar negro por #9F2241
          const svgColoreado = svgNormalizado
            .replace(/fill="#000000"/gi, 'fill="#9F2241"')
            .replace(/fill="#000"/gi,    'fill="#9F2241"')
            .replace(/fill="black"/gi,   'fill="#9F2241"')
            .replace(/<svg /, '<svg fill="#9F2241" '); // color por defecto heredado

          const blob = new Blob([svgColoreado], { type: 'image/svg+xml' });
          const objectUrl = URL.createObjectURL(blob);

          const img = new Image();

          img.onload = () => {
            URL.revokeObjectURL(objectUrl);

            const canvas = document.createElement('canvas');
            canvas.width = tam;
            canvas.height = tam;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, tam, tam);
            ctx.drawImage(img, 0, 0, tam, tam);

            try {
              const imageData = ctx.getImageData(0, 0, tam, tam);
              if (!map.hasImage(id)) {
                map.addImage(id, {
                  width: tam,
                  height: tam,
                  data: imageData.data, // Uint8ClampedArray RGBA
                });
                console.log(`✅ SVG registrado: ${id}`);
              }
            } catch (e) {
              console.error(`addImage falló para ${id}:`, e);
            }
            resolve();
          };

          img.onerror = (e) => {
            URL.revokeObjectURL(objectUrl);
            console.warn(`img.onerror para ${id}:`, e);
            resolve();
          };

          img.src = objectUrl;
        })
        .catch(err => {
          console.error(`fetch error ${id} (${url}):`, err);
          resolve();
        });
    });
  };

  // ── Helper: carga PNG via map.loadImage ───────────────────────────────────
 const loadPngImage = (map, id, url) => {
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = tam;
      canvas.height = tam;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, tam, tam);
      ctx.drawImage(img, 0, 0, tam, tam);

      try {
        const imageData = ctx.getImageData(0, 0, tam, tam);
        if (!map.hasImage(id)) {
          map.addImage(id, {
            width: tam,
            height: tam,
            data: imageData.data,
          });
          console.log(`✅ PNG registrado: ${id}`);
        }
      } catch (e) {
        console.error(`addImage falló para ${id}:`, e);
      }
      resolve();
    };

    img.onerror = (e) => {
      console.warn(`img.onerror PNG ${id}:`, e);
      resolve();
    };

    img.src = url; // URL directa, sin fetch ni blob
  });
};
  // ── Carga todos los íconos según su tipo ──────────────────────────────────
  const loadIcons = useCallback((map) => {
    POI_ICONS.forEach(({ id, url, type }) => {
      if (map.hasImage(id)) return;
      if (type === 'svg') {
        loadSvgAsImage(map, id, url);
      } else {
        loadPngImage(map, id, url);
      }
    });
  }, []);

  // ── Eventos del mapa ──────────────────────────────────────────────────────
  const onMapLoad = useCallback((evt) => {
    const map = evt.target;
    loadIcons(map);

    // Carga bajo demanda si MapLibre pide una imagen antes de que esté lista
    map.on('styleimagemissing', (e) => {
      const missing = POI_ICONS.find(icon => icon.id === e.id);
      if (!missing) return;

      if (missing.type === 'svg') {
        loadSvgAsImage(map, missing.id, missing.url);
      } else {
        loadPngImage(map, missing.id, missing.url);
      }
    });
  }, [loadIcons]);

  const onStyleData = useCallback((evt) => {
    loadIcons(evt.target);
  }, [loadIcons]);

  // IDs de fill-layers activos para que sean clickeables
  const activePolygonFillLayerIds = Object.entries(polygonsData)
    .filter(([, geojson]) => geojson !== null)
    .map(([layer]) => `layer-${layer}-fill`);

  const activePoisFillLayerIds = Object.entries(poisData || {})
    .filter(([, geojson]) => geojson?.features?.length > 0)
    .map(([type]) => `layer-poi-${type}-fill`);

  const denueFeaturesExist = denueVisible && denueData?.features?.length > 0;

  return (
    <Map
      {...viewState}
      onMove={onMove}
      onMouseMove={onMouseMove}
      style={{ width: '100%', height: '100%' }}
      mapStyle={mapStyleUrl}
      cursor={cursor}
      onClick={onClick}
      onLoad={onMapLoad}
      onStyleData={onStyleData}
      interactiveLayerIds={[
        ...activePolygonFillLayerIds,
        ...activePoisFillLayerIds,
        ...Object.keys(poisData || {}).map(type => `layer-poi-${type}-point`),
        ...(denueFeaturesExist ? ['layer-denue-points'] : []),
      ]}
    >
      <NavigationControl position="top-right" />
      <ScaleControl position="bottom-left" />

      <DrawControl
        position="top-right"
        displayControlsDefault={false}
        styles={DRAW_STYLES}
        controls={isDrawActive ? {
          polygon:     measureMode === 'measure' || measureMode === 'measure_filtrar',
          line_string: measureMode === 'measure_distancia',
          trash:       true,
        } : {}}
        onCreate={onCreatePolygon}
        onUpdate={onUpdatePolygon}
        onDelete={onDeletePolygon}
        setDrawInstance={setDrawInstance}
        onSelectionChange={onSelectionChange}
      />

      <PolygonLayers   polygonsData={polygonsData} />
      <PoisLayer       poisData={poisData} />
      <DenueLayer      denueData={denueData} colorMap={denueColorMap} visible={denueVisible} />
      <CustomMarkerLayer marker={customMarker} />

      {circlePreview && (
        <Source id="circle-preview" type="geojson" data={circlePreview}>
          <Layer id="circle-preview-fill"    type="fill" paint={{ 'fill-color': '#4A90D9', 'fill-opacity': 0.15 }} />
          <Layer id="circle-preview-outline" type="line" paint={{ 'line-color': '#4A90D9', 'line-width': 2, 'line-dasharray': [4, 2] }} />
        </Source>
      )}

      {circleCenterMarker && (
        <Source id="circle-center-marker" type="geojson"
          data={{ type: 'Feature', geometry: { type: 'Point', coordinates: circleCenterMarker } }}>
          <Layer id="circle-center-point" type="circle"
            paint={{ 'circle-radius': 6, 'circle-color': '#4A90D9', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' }} />
        </Source>
      )}

      {polyPopup && (
        <Popup longitude={polyPopup.longitude} latitude={polyPopup.latitude}
          onClose={onClosePolyPopup} closeButton closeOnClick={false} anchor="bottom">
          <div style={styles.polyPopupContent}>
            <div style={{ ...styles.polyPopupHeader, backgroundColor: polyPopup.color || '#9F2241' }}>
              <span style={styles.polyPopupTipo}>{polyPopup.tipo || 'DETALLE'}</span>
              <span style={styles.polyPopupNombre}>{polyPopup.nombre}</span>
            </div>
            <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
              <table style={styles.popupTable}>
                <tbody>
                  {Object.entries(polyPopup.properties)
                    .filter(([, v]) => v !== null && v !== '' && v !== undefined)
                    .map(([k, v]) => {
                      const cleanKey = k.split('_').pop().toUpperCase();
                      return (
                        <tr key={k}>
                          <td style={styles.popupTdLabel}>{cleanKey}:</td>
                          <td style={styles.popupTdValue}>{String(v).toUpperCase()}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </Popup>
      )}

      {/* Popup DENUE */}
      {denuePopup && (
        <Popup
          longitude={denuePopup.longitude}
          latitude={denuePopup.latitude}
          onClose={onCloseDenuePopup}
          closeButton
          closeOnClick={false}
          anchor="bottom"
        >
          <div style={{ width: 250, maxHeight: 340, overflowY: 'auto', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{
              backgroundColor: denuePopup.color || '#9F2241',
              color: '#fff', padding: '8px 12px',
              margin: '-7px -7px 8px', borderRadius: '4px 4px 0 0',
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', opacity: 0.85, marginBottom: 2 }}>
                DENUE — Unidad Económica
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>
                {denuePopup.properties.nombre_act || '—'}
              </div>
            </div>
            {Object.entries(DENUE_FIELD_LABELS).map(([field, label]) => {
              const val = denuePopup.properties[field];
              if (val === null || val === undefined || String(val).trim() === '') return null;
              return (
                <div key={field} style={{ padding: '5px 4px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 12, color: '#1e293b', marginTop: 1 }}>
                    {String(val)}
                  </div>
                </div>
              );
            })}
          </div>
        </Popup>
      )}

      {/* Capas cargadas por el usuario (GPKG / CSV / URL Externa) */}
      {userLayers && userLayers.map((layer) => (
        <React.Fragment key={layer.id}>
          
          {/* 1. Declaramos la FUENTE de datos (se cierra en sí misma) */}
          <Source id={`source-${layer.id}`} type="geojson" data={layer.data} />

          {/* 2. Declaramos las CAPAS visuales vinculadas a esa fuente */}
          {layer.isExternal ? (
            <>
              {/* Capa de Calor */}
              <Layer
                id={`${layer.id}-heatmap`}
                type="heatmap"
                source={`source-${layer.id}`}
                paint={{
                  'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
                  'heatmap-color': [
                    'interpolate', ['linear'], ['heatmap-density'],
                    0, 'rgba(33,102,172,0)', 0.2, 'rgb(103,169,207)',
                    0.4, 'rgb(209,229,240)', 0.6, 'rgb(253,219,199)',
                    0.8, 'rgb(239,138,98)', 1, 'rgb(178,24,43)' 
                  ],
                  'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 5, 15, 20],
                  'heatmap-opacity': 0.85
                }}
              />
              
              {/* Puntos de respaldo (cuando haces mucho zoom) */}
              <Layer
                id={`${layer.id}-dots`}
                type="circle"
                source={`source-${layer.id}`}
                paint={{
                  'circle-radius': 3,
                  'circle-color': 'rgba(178,24,43, 0.6)',
                  'circle-stroke-width': 0,
                  'circle-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0, 14, 1] 
                }}
              />
            </>
          ) : (
            <>
              {/* Líneas (Archivos Locales) */}
              <Layer
                id={`${layer.id}-lines`}
                type="line"
                source={`source-${layer.id}`}
                filter={['==', '$type', 'LineString']}
                paint={{ 'line-color': '#00bf92', 'line-width': 1.5, 'line-opacity': 0.8 }}
              />
              
              {/* Puntos (Archivos Locales) */}
              <Layer
                id={`${layer.id}-circle`}
                type="circle"
                source={`source-${layer.id}`}
                filter={['==', ['geometry-type'], 'Point']}
                paint={{ 'circle-radius': 7, 'circle-color': '#dcc160', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' }}
              />

              {/* Polígonos (Archivos Locales) */}
              <Layer
                id={`${layer.id}-fill`}
                type="fill"
                source={`source-${layer.id}`}
                filter={['==', ['geometry-type'], 'Polygon']}
                paint={{ 'fill-color': '#a479c2', 'fill-opacity': 0.4 }}
              />
            </>
          )}
        </React.Fragment>
      ))}
    </Map>
  );
}