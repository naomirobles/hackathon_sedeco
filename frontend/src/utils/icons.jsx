import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDove, 
        faDrawPolygon, 
        faLocationArrow, 
        faRulerCombined,
        faArrowsLeftRightToLine,
        faDownload,
        faBuildingColumns,
        faShieldHalved,
        faHospital,
        faGraduationCap,
        faCartPlus,
        faBuildingFlag,
        faHouseChimneyUser,
        faGlobe,
        faEarthAmerica
      } from '@fortawesome/free-solid-svg-icons';

const Icons = {
  layers: (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  map: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
      <path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z" />
    </svg>
  ),
  filter: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
      <path d="M4.25 5.61C6.27 8.2 10 13 10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-6s3.73-4.8 5.75-7.39c.51-.66.04-1.61-.79-1.61H5.04c-.83 0-1.3.95-.79 1.61z" />
    </svg>
  ),
  location: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  ),
  table: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
      <path d="M3 3h18v18H3V3zm16 16V5H5v14h14zM7 7h2v2H7V7zm0 4h2v2H7v-2zm0 4h2v2H7v-2zm4-8h6v2h-6V7zm0 4h6v2h-6v-2zm0 4h6v2h-6v-2z" />
    </svg>
  ),
  upload: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
      <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  ),
  minimize: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M6 19h12v2H6z" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </svg>
  ),
  search_toolbar: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </svg>
  ),
  camera: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
    </svg>
  ),
  measure: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
      <path d="M19.5 9.5L21 11l-8 8-1.5-1.5V16h-2v-2h-2v-2h-2v-2H5V8H3L4.5 6.5 19.5 9.5zM15 11h2v2h-2v-2zm-4 4h2v2h-2v-2zm-4-4h2v2H7v-2z" />
    </svg>
  ),
  peace:   <FontAwesomeIcon icon={faDove}          style={{ width: '24px', height: '24px' }} />,
  draw:    <FontAwesomeIcon icon={faDrawPolygon}   style={{ width: '24px', height: '24px' }} />,
  pointer: <FontAwesomeIcon icon={faLocationArrow} style={{ width: '24px', height: '24px' }} />,
  ruler: <FontAwesomeIcon icon={faRulerCombined} style={{ width: '24px', height: '24px' }} />,
  distance: <FontAwesomeIcon icon={faArrowsLeftRightToLine} style={{ width: '34px', height: '34px' }} />,
  download: <FontAwesomeIcon icon={faDownload} style={{ width: '24px', height: '24px' }} />,
  government: <FontAwesomeIcon icon={faBuildingColumns} style={{ width: '20px', height: '20px' }} />,
  security: <FontAwesomeIcon icon={faShieldHalved} style={{ width: '20px', height: '20px' }} />,
  health: <FontAwesomeIcon icon={faHospital} style={{ width: '20px', height: '20px' }} />,
  education: <FontAwesomeIcon icon={faGraduationCap} style={{ width: '20px', height: '20px' }} />,
  commerce: <FontAwesomeIcon icon={faCartPlus} style={{ width: '20px', height: '20px' }} />,
  services: <FontAwesomeIcon icon={faBuildingFlag} style={{ width: '20px', height: '20px' }} />,
  community: <FontAwesomeIcon icon={faHouseChimneyUser} style={{ width: '20px', height: '20px' }} />,
  globe: <FontAwesomeIcon icon={faEarthAmerica} style={{ width: '20px', height: '20px' }} />,
  transport: <img src="../../assets/movilidad_integrada.svg" width="22" height="22" alt="C5" />,
  gobierno_servicios_publicos: <img src="../../assets/pois/gobierno_servicios_publicos.svg" width="22" height="22" alt="*" />,
  seguridad_emergencias: <img src="../../assets/pois/seguridad_emergencias.svg" width="22" height="22" alt="*" />,
  salud: <img src="../../assets/pois/salud.svg" width="22" height="22" alt="*" />,
  educacion: <img src="../../assets/pois/educacion.svg" width="22" height="22" alt="*" />,
  comercio_abasto: <img src="../../assets/pois/comercio_abasto.svg" width="22" height="22" alt="*" />,
  servicios: <img src="../../assets/pois/servicios.svg" width="22" height="22" alt="*" />,
  comunidad: <img src="../../assets/pois/comunidad.svg" width="22" height="22" alt="*" />,
  eventos: <img src="../../assets/pois/eventos.svg" width="22" height="22" alt="*" />,
  metro: <img src="../../assets/pois/metro.svg" width="22" height="22" alt="*" />,
  metrobus: <img src="../../assets/pois/metrobus.svg" width="22" height="22" alt="*" />,
  cablebus: <img src="../../assets/pois/cablebus.svg" width="22" height="22" alt="*" />,
  transporte_generico: <img src="../../assets/pois/transporte.svg" width="22" height="22" alt="*" />,
  cetram: <img src="../../assets/pois/cetram.png" width="22" height="22" alt="*" />,
  ecobici: <img src="../../assets/pois/ecobici.png" width="22" height="22" alt="*" />,
  tren_ligero: <img src="../../assets/pois/tren_ligero.png" width="22" height="22" alt="*" />,
  verificentro: <img src="../../assets/pois/verificentro.png" width="22" height="22" alt="*" />,

  // ícono de chat para el asistente virtual
  chat: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12zM7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>
  denue: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z"/>
    </svg>
  ),

  //ícono de cámara para cámaras
  layersCamera: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
      <path d="M13 7h-2L9 9H5c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2h-4l-2-2zM12 18c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.65 0-3 1.35-3 3s1.35 3 3 3 3-1.35 3-3-1.35-3-3-3z"/>
    </svg>
  ),

};

export default Icons;