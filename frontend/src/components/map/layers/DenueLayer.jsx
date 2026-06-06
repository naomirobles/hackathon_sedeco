import React from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';

export default function DenueLayer({ denueData, colorMap, visible }) {
  if (!visible || !denueData?.features?.length) return null;

  const categories = Object.keys(colorMap);

  const colorExpr = categories.length > 0
    ? ['match', ['get', 'nombre_act'], ...categories.flatMap(cat => [cat, colorMap[cat]]), '#aaaaaa']
    : '#9F2241';

  return (
    <Source id="source-denue" type="geojson" data={denueData}>
      <Layer
        id="layer-denue-points"
        type="circle"
        paint={{
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3, 15, 7],
          'circle-color': colorExpr,
          'circle-opacity': 0.85,
          'circle-stroke-width': 0.8,
          'circle-stroke-color': '#ffffff',
        }}
      />
    </Source>
  );
}
