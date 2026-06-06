import React, { useState, useCallback, useRef } from 'react';
import area   from '@turf/area';
import length from '@turf/length';
import circle from '@turf/circle';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';

// Hooks
import { useFilters }  from './hooks/useFilter';
import { usePolygons } from './hooks/usePolygons';
import { usePois }     from './hooks/usePOIS';
import { useDenue }    from './hooks/useDenue';

// Layout
import Header        from './components/layout/Header';
import Toolbar       from './components/layout/Toolbar';
import FloatingPanel from './components/layout/FloatingPanel';

// Mapa
import MapView from './components/map/mapView';

// Paneles
import MapStylePanel       from './components/panels/MapStylePanel';
import FilterPanel         from './components/panels/FilterPanel';
import ColoniaPanel        from './components/panels/ColoniaPanel';
import CuadrantePanel      from './components/panels/CuadrantePanel';
import SectorPanel         from './components/panels/SectorPanel';
import C2Panel             from './components/panels/C2Panel';
import CoordinatesPanel    from './components/panels/CoordinatesPanel';
import TerritoriosPazPanel from './components/panels/TerritoriosPazPanel';
import MeasurementPanel   from './components/panels/MeasurementPanel';
import DistancePanel   from './components/panels/DistancePanel';
import FilterPolygonPanel   from './components/panels/FilterPolygonPanel';
import PoisPanel          from './components/panels/PoisPanel';
import DenuePanel         from './components/panels/DenuePanel';
import UploadPanel        from './components/panels/UploadPanel';

// Chatbot / Asesor de Negocios IA
import ChatView from './components/chat/ChatView';

// Constantes y estilos
import { LAYER_FIELD_MAP, LAYER_COLORS } from './constants';
import Icons   from './utils/icons';
import styles  from './styles';
import { downloadMapHTML } from './utils/mapExport';

// ── Inyectar CSS global una sola vez ──────────────────────────────────────────
const globalStyle = document.createElement('style');
globalStyle.textContent = `
  body { margin: 0; padding: 0; overflow: hidden; zoom: 0.75; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .mapboxgl-ctrl-group { background:#fff; border-radius:4px; box-shadow:0 0 0 2px rgba(0,0,0,0.1); overflow:hidden; margin:10px; pointer-events:auto; }
  .mapboxgl-ctrl-group button { width:30px; height:30px; display:block; padding:0; outline:none; border:0; border-bottom:1px solid #ddd; background-color:transparent; cursor:pointer; }
  .mapboxgl-ctrl-group button:last-child { border-bottom:none; }
  .mapbox-gl-draw_ctrl-draw-btn { background-repeat:no-repeat; background-position:center; }
`;
document.head.appendChild(globalStyle);

// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  // ── Datos ─────────────────────────────────────────────────────────────────
  const { filters, updateFilter, clearFilters, togglePolygonLayer, clearPoisFilters } = useFilters();

  // ── Polígono dibujado ──────────────────────────────────────────────────────
  const [drawnPolygon, setDrawnPolygon] = useState(null);

  // ── Polígonos y POIs ───────────────────────────────────────────────────────
  const polygonsData = usePolygons(filters);
  const { data: rawPoisData, menuOptions: poisMenuOptions, especialidades } = usePois(filters);

  // ── DENUE — lazy, solo cuando hay filtro espacial ─────────────────────────
  const { denueData, denueStats, colorMap: denueColorMap, loading: denueLoading } = useDenue(filters.spatialFilterPolygons);
  const [denueVisible, setDenueVisible] = useState(true);
  const [denuePopup, setDenuePopup]     = useState(null);

  // ── Filtrado espacial en el cliente (para el mapa) ─────────────────────────
  const poisData = React.useMemo(() => {
    if (!rawPoisData || !filters.spatialFilterPolygons) return rawPoisData;
    const filtered = {};
    Object.keys(rawPoisData).forEach(key => {
      const geojson = rawPoisData[key];
      if (!geojson?.features) return;
      const features = geojson.features.filter(f => {
        if (!f.geometry) return false;
        if (f.geometry.type === 'Point') {
          const p = point(f.geometry.coordinates);
          return filters.spatialFilterPolygons.features.some(poly => booleanPointInPolygon(p, poly));
        }
        if (f.geometry.type === 'Polygon' && f.geometry.coordinates[0]?.length > 0) {
          const p = point(f.geometry.coordinates[0][0]);
          return filters.spatialFilterPolygons.features.some(poly => booleanPointInPolygon(p, poly));
        }
        if (f.geometry.type === 'MultiPolygon' && f.geometry.coordinates[0]?.[0]?.length > 0) {
          const p = point(f.geometry.coordinates[0][0][0]);
          return filters.spatialFilterPolygons.features.some(poly => booleanPointInPolygon(p, poly));
        }
        return false;
      });
      filtered[key] = { ...geojson, features };
    });
    return filtered;
  }, [rawPoisData, filters.spatialFilterPolygons]);

  // ── UI / Paneles ───────────────────────────────────────────────────────────
  const [activePanels, setActivePanels] = useState([]);
  const [mapStyle, setMapStyle]         = useState('positron');

  // ── Mapa ───────────────────────────────────────────────────────────────────
  const [viewState,    setViewState]    = useState({ longitude: -99.1332, latitude: 19.4326, zoom: 11 });
  const [cursor,       setCursor]       = useState('default');
  const [mouseCoords,  setMouseCoords]  = useState({ lng: -99.1332, lat: 19.4326 });
  const [customMarker, setCustomMarker] = useState(null);

  // ── Popups ─────────────────────────────────────────────────────────────────
  const [polyPopup, setPolyPopup] = useState(null);

  // ── Herramientas de dibujo ─────────────────────────────────────────────────
  const [measurements,      setMeasurements]      = useState({ area: 0, perimeter: 0 });
  const [filteredPoisCount, setFilteredPoisCount] = useState(null);
  const [drawInstance,      setDrawInstance]      = useState(null);
  const drawInstanceRef = useRef(null);

  const handleSetDrawInstance = (inst) => {
    drawInstanceRef.current = inst;
    setDrawInstance(inst);
  };

  const [activeTool,         setActiveTool]         = useState('polygon');
  const [circlePreview,      setCirclePreview]      = useState(null);
  const [circleCenterMarker, setCirkleCenterMarker] = useState(null);
  const circleCenter = useRef(null);
  const circleStep   = useRef(0);

  const measureMode  = activePanels.find(p => p.startsWith('measure')) || null;
  const isDrawActive = !!measureMode;

  // ── Capas subidas por el usuario ──────────────────────────────────────────
  const [userLayers, setUserLayers] = useState([]);

  // ── Panel Chatbot ─────────────────────────────────────────────────────────
  const [isChatOpen, setIsChatOpen] = useState(false);

  // ── Filtrado espacial para capas subidas ──────────────────────────────────
  const filteredUserLayers = React.useMemo(() => {
    if (!filters.spatialFilterPolygons) return userLayers;

    return userLayers.map(layer => {
      if (!layer.data || !layer.data.features) return layer;

      const filteredFeatures = layer.data.features.filter(f => {
        if (!f.geometry) return false;
        if (f.geometry.type === 'Point') {
          const p = point(f.geometry.coordinates);
          return filters.spatialFilterPolygons.features.some(poly => booleanPointInPolygon(p, poly));
        }
        if (f.geometry.type === 'Polygon' && f.geometry.coordinates[0]?.length > 0) {
          const p = point(f.geometry.coordinates[0][0]);
          return filters.spatialFilterPolygons.features.some(poly => booleanPointInPolygon(p, poly));
        }
        if (f.geometry.type === 'MultiPolygon' && f.geometry.coordinates[0]?.[0]?.length > 0) {
          const p = point(f.geometry.coordinates[0][0][0]);
          return filters.spatialFilterPolygons.features.some(poly => booleanPointInPolygon(p, poly));
        }
        return false;
      });

      return {
        ...layer,
        data: { ...layer.data, features: filteredFeatures }
      };
    });
  }, [userLayers, filters.spatialFilterPolygons]);

  // Cuenta POIs dentro del polígono dibujado (para mostrar en el panel)
  const handleSpatialFilterCountOnly = useCallback(() => {
    const inst = drawInstanceRef.current;
    if (!inst) return;
    const drawn = inst.getAll();
    if (!drawn.features.length) {
      setFilteredPoisCount(null);
      return;
    }

    if (rawPoisData) {
      let poiTotal = 0;
      Object.keys(rawPoisData).forEach(key => {
        const geojson = rawPoisData[key];
        if (!geojson?.features) return;
        const inside = geojson.features.filter(f => {
          if (!f.geometry) return false;
          if (f.geometry.type === 'Point') {
            const p = point(f.geometry.coordinates);
            return drawn.features.some(poly => booleanPointInPolygon(p, poly));
          }
          if (f.geometry.type === 'Polygon' && f.geometry.coordinates[0]?.length > 0) {
            const p = point(f.geometry.coordinates[0][0]);
            return drawn.features.some(poly => booleanPointInPolygon(p, poly));
          }
          if (f.geometry.type === 'MultiPolygon' && f.geometry.coordinates[0]?.[0]?.length > 0) {
            const p = point(f.geometry.coordinates[0][0][0]);
            return drawn.features.some(poly => booleanPointInPolygon(p, poly));
          }
          return false;
        });
        poiTotal += inside.length;
      });
      setFilteredPoisCount(poiTotal);
    }
  }, [rawPoisData]);

  // ── Handlers de dibujo ────────────────────────────────────────────────────
  const onUpdatePolygon = useCallback((e) => {
    const feature = e.features[0];
    if (!feature) return;
    if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
      setMeasurements({ area: area(feature), perimeter: length(feature, { units: 'kilometers' }) * 1000 });
    } else if (feature.geometry.type === 'LineString') {
      setMeasurements({ area: 0, perimeter: length(feature, { units: 'kilometers' }) * 1000 });
    }
    setDrawnPolygon(JSON.stringify(feature.geometry));
    handleSpatialFilterCountOnly();
  }, [handleSpatialFilterCountOnly]);

  const isPromptingRef = useRef(false);

  const onCreatePolygon = useCallback((e) => {
    if (isPromptingRef.current) return;

    const feature = e.features[0];
    const inst = drawInstanceRef.current;
    if (!feature || !inst) return;

    if (feature.properties?.nombre) return;

    isPromptingRef.current = true;
    try {
      const allFeatures = inst.getAll().features;
      const defaultName = `sin_nombre${allFeatures.length}`;
      const nombre = window.prompt('Ingrese un nombre para este polígono/medición:', defaultName);
      const finalNombre = nombre || defaultName;
      inst.setFeatureProperty(feature.id, 'nombre', finalNombre);
    } finally {
      isPromptingRef.current = false;
    }

    onUpdatePolygon(e);
  }, [onUpdatePolygon]);

  const onDeletePolygon = useCallback(() => {
    setMeasurements({ area: 0, perimeter: 0 });
    setDrawnPolygon(null);
    setFilteredPoisCount(null);
    circleCenter.current = null;
    handleSpatialFilterCountOnly();
  }, [handleSpatialFilterCountOnly]);

  const onSelectionChange = useCallback((e) => {
    const feature = e.features?.[0];
    if (!feature) return;
    if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
      setMeasurements({ area: area(feature), perimeter: length(feature, { units: 'kilometers' }) * 1000 });
    } else if (feature.geometry.type === 'LineString') {
      setMeasurements({ area: 0, perimeter: length(feature, { units: 'kilometers' }) * 1000 });
    }
  }, []);

  const handleSetTool = (tool) => {
    if (!drawInstance) return;
    setActiveTool(tool);
    circleCenter.current = null; circleStep.current = 0;
    setCirclePreview(null); setCirkleCenterMarker(null);
    if      (tool === 'select')  { drawInstance.changeMode('simple_select');    setCursor('default'); }
    else if (tool === 'polygon') { drawInstance.changeMode('draw_polygon');     setCursor('crosshair'); }
    else if (tool === 'line')    { drawInstance.changeMode('draw_line_string'); setCursor('crosshair'); }
    else if (tool === 'edit') {
      const selected = drawInstance.getSelectedIds();
      const all      = drawInstance.getAll();
      const id       = selected[0] ?? all.features[0]?.id;
      if (id) { drawInstance.changeMode('direct_select', { featureId: id }); setCursor('move'); }
    } else if (tool === 'circle') { drawInstance.changeMode('simple_select'); setCursor('crosshair'); }
  };

  const handleClearSpatialFilter = () => {
    updateFilter('spatialFilterPolygons', null);
    setFilteredPoisCount(null);
  };

  const handleClearMeasure = () => {
    if (drawInstance) drawInstance.deleteAll();
    setMeasurements({ area: 0, perimeter: 0 });
    setFilteredPoisCount(null);
    setDrawnPolygon(null);
    setCirclePreview(null);
    setCirkleCenterMarker(null);
    circleStep.current = 0;
    circleCenter.current = null;
    updateFilter('spatialFilterPolygons', null);
  };

  const handleDeleteSelected = () => {
    if (!drawInstance) return;
    const ids = drawInstance.getSelectedIds();
    if (ids.length) {
      drawInstance.delete(ids);
      if (!drawInstance.getAll().features.length) {
        setMeasurements({ area: 0, perimeter: 0 });
        setFilteredPoisCount(null);
      } else {
        handleSpatialFilterCountOnly();
      }
    }
  };

  const handleSpatialFilter = () => {
    if (!drawInstance) return;
    const drawn = drawInstance.getAll();

    if (!drawn.features.length) {
      updateFilter('spatialFilterPolygons', null);
      setFilteredPoisCount(null);
      return;
    }

    updateFilter('spatialFilterPolygons', drawn);
    handleSpatialFilterCountOnly();
  };

  // ── Handlers de mapa ───────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e) => {
    setMouseCoords({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    if (activeTool === 'circle' && circleStep.current === 1 && circleCenter.current) {
      const coords   = [e.lngLat.lng, e.lngLat.lat];
      const radiusKm = length(
        { type: 'Feature', geometry: { type: 'LineString', coordinates: [circleCenter.current, coords] } },
        { units: 'kilometers' }
      );
      if (radiusKm > 0) setCirclePreview(circle(circleCenter.current, radiusKm, { units: 'kilometers', steps: 64 }));
    }
  }, [activeTool]);

  const handleMapClick = useCallback((e) => {
    // 1. Modo círculo
    if (activeTool === 'circle' && measureMode && drawInstance) {
      const coords = [e.lngLat.lng, e.lngLat.lat];
      if (circleStep.current === 0) {
        circleCenter.current = coords; circleStep.current = 1;
        setCirkleCenterMarker(coords); setCursor('cell');
      } else {
        setCirclePreview(null); setCirkleCenterMarker(null);
        const radiusKm = length(
          { type: 'Feature', geometry: { type: 'LineString', coordinates: [circleCenter.current, coords] } },
          { units: 'kilometers' }
        );
        const circlePoly = circle(circleCenter.current, radiusKm, { units: 'kilometers', steps: 64 });

        const allFeatures = drawInstance.getAll().features;
        const defaultName = `sin_nombre${allFeatures.length + 1}`;
        const nombre = window.prompt('Ingrese un nombre para este círculo:', defaultName);
        circlePoly.properties.nombre = nombre || defaultName;

        drawInstance.add(circlePoly);
        setMeasurements({ area: area(circlePoly), perimeter: length(circlePoly, { units: 'kilometers' }) * 1000 });
        circleCenter.current = null; circleStep.current = 0;
        setActiveTool('select'); setCursor('default'); drawInstance.changeMode('simple_select');
      }
      return;
    }

    const features = e.features || [];

    // 2. Puntos DENUE
    const denueFeature = features.find(f => f.layer.id === 'layer-denue-points');
    if (denueFeature) {
      const nombreAct = denueFeature.properties.nombre_act;
      setDenuePopup({
        longitude:  e.lngLat.lng,
        latitude:   e.lngLat.lat,
        color:      denueColorMap[nombreAct] || '#9F2241',
        properties: denueFeature.properties,
      });
      setPolyPopup(null);
      return;
    }
    setDenuePopup(null);

    // 3. Lógica para POIs (Puntos y Polígonos)
    const poiFeature = features.find(f =>
      f.layer.id.startsWith('layer-poi-') &&
      (f.layer.id.endsWith('-fill') || f.layer.id.endsWith('-point'))
    );

    const genericPoly = features.find(f => f.layer.id.startsWith('layer-') && f.layer.id.endsWith('-fill'));

    const targetFeature = poiFeature || genericPoly;

    if (targetFeature) {
      const layerId = targetFeature.layer.id;
      const layerName = layerId
        .replace('layer-poi-', '')
        .replace('layer-', '')
        .replace('-fill', '')
        .replace('-point', '');

      const fieldInfo = LAYER_FIELD_MAP[layerName];

      setPolyPopup({
        longitude: e.lngLat.lng,
        latitude:  e.lngLat.lat,
        layer:     layerName,
        nombre:    targetFeature.properties.NOMBRE_POI ||
                  (fieldInfo ? (targetFeature.properties[fieldInfo.field] ?? 'Sin nombre') : 'Sin nombre'),
        tipo:      targetFeature.properties.POI || fieldInfo?.label || "INFRAESTRUCTURA",
        color:     LAYER_COLORS[layerName] ?? '#9F2241',
        properties: targetFeature.properties,
      });
      return;
    }

    setPolyPopup(null);
  }, [activeTool, measureMode, drawInstance, poisData, denueColorMap]);

  // ── Toggle de paneles ─────────────────────────────────────────────────────
  const togglePanel = (id) => {
    // ── Chatbot: abre el drawer lateral ─────────────────────────────────────
    if (id === 'chat') {
      setIsChatOpen(prev => !prev);
      return;
    }

    if (id === 'descargar_mapa') {
      const allDrawings = drawInstance ? drawInstance.getAll() : (drawnPolygon ? JSON.parse(drawnPolygon) : null);

      downloadMapHTML({
        polygonsData,
        poisData,
        userLayers: filteredUserLayers,
        drawnPolygon: allDrawings,
        mapStyle,
        viewState,
        denueData:     denueVisible ? denueData : null,
        denueColorMap: denueColorMap,
      });
      return;
    }
    setActivePanels(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
    if (id.startsWith('measure') && drawInstance) {
      setCursor('default');
    }
  };

  const handleClearCoordinates = () => {
    setCustomMarker(null);
  };

  const handleGoToCoordinates = ({ latitude, longitude }) => {
    setViewState(prev => ({ ...prev, latitude, longitude, zoom: 16 }));
    setCustomMarker({ latitude, longitude });
  };

  const PANEL_DEFS = { filter: { x: 70, y: 100 }, default: { x: 70, y: 100 } };
  const pos = (id) => PANEL_DEFS[id] ?? PANEL_DEFS.default;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={styles.appContainer}>
      <Header />
      <Toolbar activePanels={activePanels} togglePanel={togglePanel} isChatOpen={isChatOpen} />

      <div style={styles.mapWrapper}>
        <MapView
          viewState={viewState}
          onMove={evt => setViewState(evt.viewState)}
          onMouseMove={handleMouseMove}
          onClick={handleMapClick}
          mapStyle={mapStyle}
          cursor={cursor}
          polygonsData={polygonsData}
          poisData={poisData}
          denueData={denueData}
          denueColorMap={denueColorMap}
          denueVisible={denueVisible}
          denuePopup={denuePopup}
          onCloseDenuePopup={() => setDenuePopup(null)}
          customMarker={customMarker}
          circlePreview={circlePreview}
          circleCenterMarker={circleCenterMarker}
          isDrawActive={isDrawActive}
          measureMode={measureMode}
          setDrawInstance={handleSetDrawInstance}
          onCreatePolygon={onCreatePolygon}
          onUpdatePolygon={onUpdatePolygon}
          onDeletePolygon={onDeletePolygon}
          onSelectionChange={onSelectionChange}
          polyPopup={polyPopup}
          onClosePolyPopup={() => setPolyPopup(null)}
          userLayers={filteredUserLayers}
        />

        <div style={styles.coordsDisplay}>
          {mouseCoords.lng.toFixed(6)}, {mouseCoords.lat.toFixed(6)}
        </div>

        {filteredUserLayers.length > 0 && (
          <div style={{
            position: 'absolute', bottom: '80px', left: '10px',
            backgroundColor: '#ffffff', borderRadius: '6px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)', zIndex: 10,
            width: '280px', overflow: 'hidden', fontFamily: 'sans-serif'
          }}>
            <div style={{ padding: '10px 15px', borderBottom: '2px solid #9F2241', backgroundColor: '#f9f9f9' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#333' }}>Capas cargadas</span>
            </div>
            <div style={{ padding: '10px 15px' }}>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #ddd', textAlign: 'left', color: '#666' }}>
                    <th style={{ paddingBottom: '5px' }}>Recurso</th>
                    <th style={{ paddingBottom: '5px', textAlign: 'right' }}>Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUserLayers.map(layer => (
                    <tr key={layer.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px 0', color: layer.isExternal ? '#9F2241' : '#333', fontSize: '11px' }}>
                        {layer.name.length > 25 ? layer.name.substring(0, 25) + '...' : layer.name}
                      </td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'bold' }}>
                        {layer.data?.features?.length || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SIMBOLOGÍA DEL MAPA DE CALOR */}
        {filteredUserLayers.some(layer => layer.isExternal) && (
          <div style={{
            position: 'absolute', bottom: '80px', right: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '10px 15px',
            borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            zIndex: 10, display: 'flex', flexDirection: 'column',
            alignItems: 'center', fontFamily: 'sans-serif'
          }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '8px', textAlign: 'center', color: '#333' }}>
              Incidencias<br/>(Densidad)
            </span>
            <span style={{ fontSize: '10px', color: '#666', fontWeight: 'bold' }}>Alta</span>
            <div style={{
              width: '16px', height: '100px',
              background: 'linear-gradient(to top, rgba(33,102,172,0), rgb(103,169,207), rgb(209,229,240), rgb(253,219,199), rgb(239,138,98), rgb(178,24,43))',
              margin: '5px 0', border: '1px solid #ccc', borderRadius: '3px'
            }} />
            <span style={{ fontSize: '10px', color: '#666', fontWeight: 'bold' }}>Baja</span>
          </div>
        )}
      </div>

      {/* ── Paneles flotantes ─────────────────────────────────────────────── */}
      <FloatingPanel id="map" title="Tipo de Mapa" icon={Icons.map}
        isOpen={activePanels.includes('map')} onClose={() => togglePanel('map')}
        initialPosition={pos('default')} width={280} minHeight={150}>
        <MapStylePanel mapStyle={mapStyle} setMapStyle={setMapStyle} />
      </FloatingPanel>

      <FloatingPanel id="filter_alcaldia" title="Filtrar por Alcaldía" icon={Icons.filter}
        isOpen={activePanels.includes('filter_alcaldia')} onClose={() => togglePanel('filter_alcaldia')}
        initialPosition={pos('filter')} width={300}>
        <FilterPanel filters={filters} updateFilter={updateFilter}
          togglePolygonLayer={togglePolygonLayer} clearFilters={clearFilters} />
      </FloatingPanel>

      <FloatingPanel id="filter_colonia" title="Búsqueda por Colonia" icon={Icons.filter}
        isOpen={activePanels.includes('filter_colonia')} onClose={() => togglePanel('filter_colonia')}
        initialPosition={pos('filter')} width={320}>
        <ColoniaPanel filters={filters} updateFilter={updateFilter} togglePolygonLayer={togglePolygonLayer} />
      </FloatingPanel>

      <FloatingPanel id="filter_cuadrante" title="Búsqueda por Cuadrante" icon={Icons.filter}
        isOpen={activePanels.includes('filter_cuadrante')} onClose={() => togglePanel('filter_cuadrante')}
        initialPosition={pos('filter')} width={320}>
        <CuadrantePanel filters={filters} updateFilter={updateFilter} togglePolygonLayer={togglePolygonLayer} />
      </FloatingPanel>

      <FloatingPanel id="filter_sector" title="Búsqueda por Sector" icon={Icons.filter}
        isOpen={activePanels.includes('filter_sector')} onClose={() => togglePanel('filter_sector')}
        initialPosition={pos('filter')} width={320}>
        <SectorPanel filters={filters} updateFilter={updateFilter} togglePolygonLayer={togglePolygonLayer} />
      </FloatingPanel>

      <FloatingPanel id="filter_c2" title="Búsqueda por C2" icon={Icons.filter}
        isOpen={activePanels.includes('filter_c2')} onClose={() => togglePanel('filter_c2')}
        initialPosition={pos('filter')} width={320}>
        <C2Panel filters={filters} updateFilter={updateFilter} togglePolygonLayer={togglePolygonLayer} />
      </FloatingPanel>

      <FloatingPanel id="location" title="Búsqueda por Coordenadas" icon={Icons.location}
        isOpen={activePanels.includes('location')} onClose={() => togglePanel('location')}
        initialPosition={pos('default')} width={300} minHeight={180}>
        <CoordinatesPanel onGoToCoordinates={handleGoToCoordinates} onClear={handleClearCoordinates} />
      </FloatingPanel>

      <FloatingPanel id="territorios_paz" title="Búsqueda por Territorios de Paz" icon={Icons.filter}
        isOpen={activePanels.includes('territorios_paz')} onClose={() => togglePanel('territorios_paz')}
        initialPosition={pos('filter')} width={320}>
        <TerritoriosPazPanel filters={filters} updateFilter={updateFilter} togglePolygonLayer={togglePolygonLayer} />
      </FloatingPanel>

      <FloatingPanel id="poi" title="Capas de Infraestructura (POIS)" icon={Icons.layers}
        isOpen={activePanels.includes('poi')} onClose={() => togglePanel('poi')}
        initialPosition={pos('filter')} width={320}>
        <PoisPanel filters={filters} updateFilter={updateFilter} togglePolygonLayer={togglePolygonLayer} menuOptions={poisMenuOptions} clearPoisFilters={clearPoisFilters} especialidades={especialidades}/>
      </FloatingPanel>

      <FloatingPanel id="measure" title="Herramientas de Medición" icon={Icons.measure}
        isOpen={activePanels.includes('measure')} onClose={() => togglePanel('measure')}
        initialPosition={pos('default')} width={300}>
        <MeasurementPanel
          measurements={measurements}
          mode={measureMode}
          onClear={handleClearMeasure}
          onDelete={handleDeleteSelected}
          onFilter={handleSpatialFilter}
          onSetTool={handleSetTool}
          activeTool={activeTool}
        />
      </FloatingPanel>

      <FloatingPanel id="measure_distancia" title="Medición de Distancia" icon={Icons.ruler}
        isOpen={activePanels.includes('measure_distancia')} onClose={() => togglePanel('measure_distancia')}
        initialPosition={pos('default')} width={300}>
        <DistancePanel
          measurements={measurements}
          mode={measureMode}
          onClear={handleClearMeasure}
          onDelete={handleDeleteSelected}
          onFilter={handleSpatialFilter}
          onSetTool={handleSetTool}
          activeTool={activeTool}
        />
      </FloatingPanel>

      <FloatingPanel id="measure_filtrar" title="Filtrar por Polígono" icon={Icons.filter}
        isOpen={activePanels.includes('measure_filtrar')} onClose={() => togglePanel('measure_filtrar')}
        initialPosition={pos('default')} width={300}>
        <FilterPolygonPanel
          measurements={measurements}
          mode={measureMode}
          onClear={handleClearMeasure}
          onDelete={handleDeleteSelected}
          onFilter={handleSpatialFilter}
          onClearFilter={handleClearSpatialFilter}
          filteredPoisCount={filteredPoisCount}
          onSetTool={handleSetTool}
          activeTool={activeTool}
        />
      </FloatingPanel>

      <FloatingPanel
        id="denue"
        title="Unidades Económicas DENUE"
        icon={Icons.denue}
        isOpen={activePanels.includes('denue')}
        onClose={() => togglePanel('denue')}
        initialPosition={{ x: 70, y: 100 }}
        width={480}
      >
        <DenuePanel
          denueStats={denueStats}
          colorMap={denueColorMap}
          visible={denueVisible}
          onToggleVisible={() => setDenueVisible(v => !v)}
          loading={denueLoading}
        />
      </FloatingPanel>

      <FloatingPanel
        id="upload"
        title="Cargar Información Externa"
        icon={Icons.upload}
        isOpen={activePanels.includes('upload')}
        onClose={() => togglePanel('upload')}
        initialPosition={{ x: 400, y: 150 }}
        width={320}
      >
        <UploadPanel
          onLayerAdded={(newLayer) => {
            setUserLayers(prev => [...prev, newLayer]);
          }}
          onLayerRemoved={(idABorrar) => {
            setUserLayers(prev => prev.filter(layer => layer.id !== idABorrar));
          }}
          onLayersCleared={() => {
            setUserLayers([]);
          }}
        />
      </FloatingPanel>

      {/* ── Chatbot: drawer lateral ────────────────────────────────────────── */}
      <ChatView
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />

      {/* ── Botón flotante del Chatbot (Esquina inferior derecha) ───────────── */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          title="Abrir Asistente Virtual"
          style={{
            position: 'fixed',
            bottom: '25px',
            right: '25px',
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            backgroundColor: '#9F2241',
            boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
            border: '3px solid white',
            cursor: 'pointer',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            padding: 0,
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.4)';
          }}
        >
          <img 
            src="/assets/robotsito.jpeg" 
            alt="Asistente Virtual" 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              display: 'block'
            }} 
            onError={(e) => {
              // Fallback si la imagen no carga
              e.target.style.display = 'none';
              e.currentTarget.parentElement.innerHTML = '<span style="font-size: 30px">🤖</span>';
            }}
          />
        </button>
      )}

    </div>
  );
}
