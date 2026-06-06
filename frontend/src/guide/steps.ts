import type { GuideStep } from './types';

export const GUIDE_STEPS: GuideStep[] = [
  {
    id: 'step-filter-polygon',
    targetId: 'guide-target-measure',
    message: 'Selecciona el área donde quieres poner tu negocio',
    icon: '📍',
    placement: 'right',
  },
  {
    id: 'step-draw-tool',
    targetId: 'guide-target-draw-tools',
    message: 'Selecciona la herramienta para empezar a dibujar',
    icon: '✏️',
    placement: 'right',
  },
  {
    id: 'step-denue',
    targetId: 'guide-target-denue',
    message: 'Consulta el Directorio Estadístico Nacional de Unidades Económicas',
    icon: '📊',
    placement: 'right',
  },
  {
    id: 'step-chat',
    targetId: 'guide-target-chat-float',
    message: 'Pregunta a nuestro chat sobre el área seleccionada',
    icon: '💬',
    placement: 'left',
  },
];
