import React, { useState } from 'react';
import Icons from '../../utils/icons';
import styles from '../../styles';

export default function Toolbar({ activePanels, togglePanel, isChatOpen }) {
  const [hoveredBtn, setHoveredBtn] = useState(null);

  const buttons = [
    { id: 'poi',             icon: Icons.layers,   tooltip: 'CAPAS POI' },
    { id: 'denue',           icon: Icons.denue,    tooltip: 'Unidades Económicas DENUE' },
    { id: 'map',             icon: Icons.map,      tooltip: 'Tipo de Mapa' },
    { id: 'filter',          icon: Icons.filter,   tooltip: 'Filtros' },
    { id: 'location',        icon: Icons.location, tooltip: 'Búsqueda por Coordenadas' },
    { id: 'territorios_paz', icon: Icons.peace,    tooltip: 'Territorios de Paz' },
    { id: 'measure',         icon: Icons.draw,     tooltip: 'Herramientas de Dibujo' },
    { id: 'upload',          icon: Icons.upload,   tooltip: 'Cargar Archivos (GPKG/Excel/URL)' },
    { id: 'chat',            icon: Icons.chat,     tooltip: 'Asesor de Negocios (IA)' },
  ];
  // Botón que siempre queda en la esquina inferior
  const bottomButton = { id: 'descargar_mapa', icon: Icons.download, tooltip: 'Descargar Mapa' };

  // IDs que usan submenú desplegable en lugar de toggle directo
  const withDropdown = ['filter', 'measure'];

    const renderBtn = (btn) => (
    <div
      key={btn.id}
      style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}
      onMouseEnter={() => setHoveredBtn(btn.id)}
      onMouseLeave={() => setHoveredBtn(null)}
    >
      <button
        style={{
          ...styles.toolbarBtn,
          ...(
            activePanels.includes(btn.id) ||
            (btn.id === 'chat'   && isChatOpen) ||
            (btn.id === 'filter'  && activePanels.some(p => p.startsWith('filter_'))) ||
            (btn.id === 'measure' && activePanels.some(p => p.startsWith('measure')))
              ? styles.toolbarBtnActive
              : {}
          ),
        }}
        onClick={() => !withDropdown.includes(btn.id) && togglePanel(btn.id)}
        title={btn.tooltip}
      >
        {btn.icon}
      </button>

      {/* Submenú: Filtros */}
      {btn.id === 'filter' && hoveredBtn === 'filter' && (
        <div style={styles.dropdownMenu}>
          <button style={styles.dropdownItem} onClick={() => togglePanel('filter_c2')}>Por C2</button>
          <button style={styles.dropdownItem} onClick={() => togglePanel('filter_alcaldia')}>Por Alcaldía</button>
          <button style={styles.dropdownItem} onClick={() => togglePanel('filter_sector')}>Por Sector</button>
          <button style={styles.dropdownItem} onClick={() => togglePanel('filter_colonia')}>Por Colonia</button>
          <button style={styles.dropdownItem} onClick={() => togglePanel('filter_cuadrante')}>Por Cuadrante</button>
        </div>
      )}

      {/* Submenú: Herramientas de Dibujo */}
      {btn.id === 'measure' && hoveredBtn === 'measure' && (
        <div style={styles.dropdownMenu}>
          <button style={styles.dropdownItem} onClick={() => togglePanel('measure')}>Medir área</button>
          <button style={styles.dropdownItem} onClick={() => togglePanel('measure_distancia')}>Medir distancia</button>
          <button style={styles.dropdownItem} onClick={() => togglePanel('measure_filtrar')}>Filtrar por polígono</button>
        </div>
      )}
    </div>
  );
  return (
    <div style={{
      ...styles.toolbar,
      justifyContent: 'space-between',  // ← separa top y bottom
    }}>
      {/* Botones principales — parte superior */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingTop: 15, width: '100%' }}>
        {buttons.map(btn => renderBtn(btn))}
      </div>

      {/* Botón fijo — parte inferior */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 15, width: '100%' }}>
        {renderBtn(bottomButton)}
      </div>
    </div>
  );


}