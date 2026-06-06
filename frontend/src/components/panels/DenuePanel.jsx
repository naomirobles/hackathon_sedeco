import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import styles from '../../styles';

const LABEL_TRUNCATE = 28; // caracteres visibles en tabla

export default function DenuePanel({ denueStats, colorMap, visible, onToggleVisible, loading }) {
  const [showChart, setShowChart] = useState(false);

  /* ── Estado vacío ────────────────────────────────────────────── */
  if (loading) {
    return (
      <div style={styles.panelSection}>
        <div style={emptyCard}>
          <div style={spinnerWrap}>
            <div style={spinnerRing} />
          </div>
          <span>Cargando datos DENUE…</span>
        </div>
      </div>
    );
  }

  if (!denueStats) {
    return (
      <div style={styles.panelSection}>
        <div style={emptyCard}>
          Dibuja un polígono en el mapa y aplica el filtro espacial para ver las unidades económicas DENUE del área.
        </div>
      </div>
    );
  }

  const { total, categories } = denueStats;
  const top = categories[0];
  const chartData = categories.slice(0, 20);

  return (
    <div style={styles.panelSection}>

      {/* ── Toggle visibilidad ──────────────────────────────────── */}
      <button
        onClick={onToggleVisible}
        style={{
          ...styles.primaryBtn,
          width: '100%', marginTop: 0, marginBottom: 2,
          backgroundColor: visible ? '#0369a1' : '#64748b',
        }}
      >
        {visible ? '● Capa DENUE activa' : '○ Capa DENUE oculta'}
      </button>

      <div style={styles.divider} />

      {/* ── Tarjetas de resumen en grid 2 columnas ──────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={statCard}>
          <span style={statLabel}>Unidades económicas</span>
          <div style={statValue}>{total.toLocaleString()}</div>
        </div>
        <div style={statCard}>
          <span style={statLabel}>Categorías</span>
          <div style={statValue}>{categories.length}</div>
        </div>
      </div>

      {top && (
        <div style={{ ...statCard, backgroundColor: '#f0fdf4', borderColor: '#86efac', gridColumn: 'span 2' }}>
          <span style={{ ...statLabel, color: '#15803d' }}>Actividad predominante</span>
          <div style={{ ...statValue, color: '#166534', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', lineHeight: 1.35, marginTop: 2 }}>
            {top.nombre_act}
          </div>
          <div style={{ fontSize: 11, color: '#16a34a', marginTop: 4 }}>
            {top.count.toLocaleString()} unidades · {top.percentage}% del área
          </div>
        </div>
      )}

      <div style={styles.divider} />

      {/* ── Selector Tabla / Gráfico ────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4 }}>
        {['Tabla de actividades', 'Gráfico'].map((label, idx) => {
          const active = idx === 0 ? !showChart : showChart;
          return (
            <button
              key={label}
              onClick={() => setShowChart(idx === 1)}
              style={{
                ...styles.clearBtn, flex: 1, marginTop: 0, fontSize: 12,
                backgroundColor: active ? '#9F2241' : '#f1f5f9',
                color: active ? '#fff' : '#475569',
                border: active ? 'none' : '1px solid #e2e8f0',
                fontWeight: active ? 600 : 400,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {!showChart ? (
        /* ── Tabla ─────────────────────────────────────────────── */
        <div style={{ overflowY: 'auto', maxHeight: 380, borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={th}>Actividad económica</th>
                <th style={{ ...th, textAlign: 'right', width: 60 }}>N</th>
                <th style={{ ...th, textAlign: 'right', width: 52 }}>%</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, i) => (
                <tr
                  key={cat.nombre_act}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa',
                  }}
                >
                  <td style={{ padding: '6px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                      <span style={{
                        width: 10, height: 10, borderRadius: '50%', marginTop: 2, flexShrink: 0,
                        backgroundColor: colorMap[cat.nombre_act] || '#aaa',
                      }} />
                      <span style={{ color: '#334155', lineHeight: 1.35 }}>
                        {cat.nombre_act.length > LABEL_TRUNCATE
                          ? cat.nombre_act.slice(0, LABEL_TRUNCATE) + '…'
                          : cat.nombre_act}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#1e293b' }}>
                    {cat.count.toLocaleString()}
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', color: '#94a3b8', fontSize: 11 }}>
                    {cat.percentage}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── Gráfico ────────────────────────────────────────────── */
        <div>
          <div style={{ height: 360 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 2, right: 14, bottom: 2, left: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => v.toLocaleString()} />
                <YAxis
                  type="category"
                  dataKey="nombre_act"
                  width={130}
                  tick={{ fontSize: 9, fill: '#475569' }}
                  tickFormatter={(v) => v.length > 22 ? `${v.slice(0, 22)}…` : v}
                />
                <Tooltip
                  formatter={(val, _, { payload }) => [
                    `${Number(val).toLocaleString()} (${payload.percentage}%)`,
                    'Unidades',
                  ]}
                  labelStyle={{ fontSize: 11, fontWeight: 700, color: '#1e293b' }}
                  contentStyle={{ fontSize: 11, borderRadius: 6 }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {chartData.map((cat) => (
                    <Cell key={cat.nombre_act} fill={colorMap[cat.nombre_act] || '#9F2241'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {categories.length > 20 && (
            <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', marginTop: 4 }}>
              Mostrando top 20 de {categories.length} categorías
            </div>
          )}
        </div>
      )}

      {/* ── Leyenda de colores (top 8) ──────────────────────────── */}
      {categories.length > 0 && (
        <>
          <div style={styles.divider} />
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            Leyenda de colores
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
            {categories.slice(0, 10).map(cat => (
              <div key={cat.nombre_act} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#475569', maxWidth: '45%' }}>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                  backgroundColor: colorMap[cat.nombre_act] || '#aaa',
                }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cat.nombre_act}
                </span>
              </div>
            ))}
            {categories.length > 10 && (
              <div style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>
                +{categories.length - 10} más…
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Estilos locales ───────────────────────────────────────────── */
const emptyCard = {
  padding: '16px', backgroundColor: '#f8fafc', borderRadius: 10,
  fontSize: 12, color: '#64748b', textAlign: 'center', lineHeight: 1.6,
  border: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column',
  alignItems: 'center', gap: 10,
};
const spinnerWrap = { display: 'flex', justifyContent: 'center' };
const spinnerRing = {
  width: 24, height: 24, borderRadius: '50%',
  border: '3px solid #e2e8f0', borderTopColor: '#9F2241',
  animation: 'spin 0.9s linear infinite',
};
const statCard = {
  padding: '12px 14px', backgroundColor: '#f8fafc',
  borderRadius: 10, border: '1px solid #e2e8f0',
  display: 'flex', flexDirection: 'column', gap: 3,
};
const statLabel = {
  fontSize: 10, fontWeight: 700, color: '#64748b',
  textTransform: 'uppercase', letterSpacing: '0.06em',
};
const statValue = {
  fontSize: 22, fontWeight: 800, color: '#1e293b', fontFamily: 'monospace', lineHeight: 1,
};
const th = {
  padding: '8px 10px', textAlign: 'left', fontSize: 11,
  fontWeight: 700, color: '#fff', backgroundColor: '#9F2241',
  position: 'sticky', top: 0, zIndex: 1,
};
