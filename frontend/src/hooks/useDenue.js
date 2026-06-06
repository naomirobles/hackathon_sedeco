import { useState, useEffect } from 'react';
import { API_BASE } from '../constants';

function hslToHex(h, s, l) {
  const sl = s / 100;
  const ll = l / 100;
  const a = sl * Math.min(ll, 1 - ll);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = ll - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function generateColorMap(categories) {
  const goldenAngle = 137.508;
  const result = {};
  categories.forEach((cat, i) => {
    const hue = (i * goldenAngle) % 360;
    result[cat] = hslToHex(hue, 62, 58);
  });
  return result;
}

export function useDenue(spatialFilterPolygons) {
  const [denueData, setDenueData]   = useState(null);
  const [denueStats, setDenueStats] = useState(null);
  const [colorMap, setColorMap]     = useState({});
  const [loading, setLoading]       = useState(false);

  const geometryKey = spatialFilterPolygons ? JSON.stringify(spatialFilterPolygons) : null;

  useEffect(() => {
    if (!spatialFilterPolygons || !spatialFilterPolygons.features?.length) {
      setDenueData(null);
      setDenueStats(null);
      setColorMap({});
      return;
    }

    let cancelled = false;

    const fetchDenue = async () => {
      setLoading(true);
      try {
        const body = JSON.stringify({ geometry: spatialFilterPolygons });
        const headers = { 'Content-Type': 'application/json' };

        const [resData, resStats] = await Promise.all([
          fetch(`${API_BASE}/denue`,       { method: 'POST', headers, body }),
          fetch(`${API_BASE}/denue/stats`, { method: 'POST', headers, body }),
        ]);

        if (cancelled) return;

        const [dataJson, statsJson] = await Promise.all([resData.json(), resStats.json()]);

        if (!cancelled) {
          setDenueData(dataJson);
          setDenueStats(statsJson);
          if (statsJson.categories?.length) {
            setColorMap(generateColorMap(statsJson.categories.map(c => c.nombre_act)));
          }
        }
      } catch (err) {
        console.error('Error cargando DENUE:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDenue();
    return () => { cancelled = true; };
  }, [geometryKey]);

  return { denueData, denueStats, colorMap, loading };
}
