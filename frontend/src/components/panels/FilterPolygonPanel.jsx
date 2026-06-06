import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLocationArrow, faDrawPolygon } from '@fortawesome/free-solid-svg-icons';
import styles from '../../styles';

export default function FilterPolygonPanel({
  measurements,
  mode,
  onClear,
  onClearFilter,
  onDelete,
  onFilter,
  filteredPoisCount,
  onSetTool,
  activeTool,
}) {
  const isFilter = mode === 'measure_filtrar';

  return (
    <div style={styles.panelSection}>
      {/* Selector de herramientas */}
      <div id="guide-target-draw-tools" style={{ display: 'flex', gap: 8, marginBottom: 2, justifyContent: 'space-between' }}>
        <button
          title="Seleccionar"
          style={{ ...styles.toolBtn, backgroundColor: activeTool === 'select' ? '#9F2241' : '#f8fafc', color: activeTool === 'select' ? '#fff' : '#64748b' }}
          onClick={() => onSetTool('select')}
        >
          <FontAwesomeIcon icon={faLocationArrow} />
          <span style={{ fontSize: 10, fontWeight: 600, marginTop: 4 }}>Seleccionar</span>
        </button>
        <button
          title="Dibujar Polígono"
          style={{ ...styles.toolBtn, backgroundColor: activeTool === 'polygon' ? '#9F2241' : '#f8fafc', color: activeTool === 'polygon' ? '#fff' : '#64748b' }}
          onClick={() => onSetTool('polygon')}
        >
          <FontAwesomeIcon icon={faDrawPolygon} />
          <span style={{ fontSize: 10, fontWeight: 600, marginTop: 4 }}>Polígono</span>
        </button>
        <button
          title="Dibujar Círculo"
          style={{ ...styles.toolBtn, backgroundColor: activeTool === 'circle' ? '#9F2241' : '#f8fafc', color: activeTool === 'circle' ? '#fff' : '#64748b' }}
          onClick={() => onSetTool('circle')}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
          </svg>
          <span style={{ fontSize: 10, fontWeight: 600, marginTop: 4 }}>Círculo</span>
        </button>
      </div>

      <div style={styles.divider} />

      {/* Resultados de área y conteo */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={styles.measureResultCard}>
          <span style={styles.measureLabel}>Área Total Dibujada</span>
          <div style={styles.measureValue}>
            {measurements.area > 0 ? (
              measurements.area < 1000000
                ? `${measurements.area.toLocaleString('en-US', { maximumFractionDigits: 2 })} m²`
                : `${(measurements.area / 1000000).toLocaleString('en-US', { maximumFractionDigits: 3 })} km²`
            ) : '---'}
          </div>
        </div>

        {filteredPoisCount !== null && (
          <div style={{ ...styles.measureResultCard, backgroundColor: '#fdf2f8', borderColor: '#fbcfe8' }}>
            <span style={{ ...styles.measureLabel, color: '#9d174d' }}>POIs dentro del área</span>
            <div style={{ ...styles.measureValue, color: '#9d174d' }}>
              {filteredPoisCount.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 15 }}>
        <button onClick={() => onSetTool('edit')} style={{ ...styles.clearBtn, flex: 1, marginTop: 0 }}>
          Editar Puntos
        </button>
        <button onClick={onDelete} style={{ ...styles.clearBtn, flex: 1, marginTop: 0 }}>
          Eliminar Seleccionados
        </button>
      </div>

      <div style={styles.divider} />
      
      {/* Botón para aplicar filtros espaciales */}
      <button 
        onClick={onFilter} 
        style={{ ...styles.primaryBtn, width: '100%', backgroundColor: '#0369a1', marginTop: 0, marginBottom: 8 }}
        disabled={measurements.area === 0}
      >
        Aplicar Filtros activos
      </button>

      {/* Botón para desactivar filtros espaciales sin borrar el polígono */}
      <button 
        onClick={onClearFilter} 
        style={{ ...styles.primaryBtn, width: '100%', backgroundColor: '#dc2626', marginTop: 0 }}
      >
        Limpiar Filtros del polígono
      </button>

      <div style={styles.divider} />
      <button onClick={onClear} style={{ ...styles.clearBtn, width: '100%', marginTop: 0 }}>
        Reiniciar Todo
      </button>
    </div>
  );
}
