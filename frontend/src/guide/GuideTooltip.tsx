import React, { useEffect, useRef, useState } from 'react';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  arrow,
} from '@floating-ui/react';
import { useGuide } from './useGuide';
import type { GuideStep } from './types';
import './GuideTooltip.css';

interface Props {
  step: GuideStep;
}

const SIDE_MAP: Record<string, string> = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right',
};

export function GuideTooltip({ step }: Props) {
  const { skip, advance, stepIndex, totalSteps } = useGuide();
  const arrowRef = useRef<HTMLDivElement>(null);

  // Track whether we successfully attached to the target element.
  // The tooltip stays invisible until Floating UI has a real anchor.
  const [anchored, setAnchored] = useState(false);

  const { refs, floatingStyles, middlewareData, placement } = useFloating({
    placement: step.placement ?? 'right',
    // 'fixed' is mandatory: reference elements (Toolbar, floating chat button)
    // use position:fixed, so coordinates must be in viewport space.
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(14),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      arrow({ element: arrowRef }),
    ],
  });

  useEffect(() => {
    setAnchored(false);

    const attach = (el: HTMLElement) => {
      refs.setReference(el);
      setAnchored(true);
    };

    const el = document.getElementById(step.targetId);
    if (el) {
      attach(el);
      return;
    }

    // The target element might not be in the DOM yet (panel still mounting).
    // Retry once after React has flushed DOM changes.
    const timer = setTimeout(() => {
      const delayed = document.getElementById(step.targetId);
      if (delayed) attach(delayed);
    }, 120);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.targetId]);

  const arrowX = middlewareData.arrow?.x;
  const arrowY = middlewareData.arrow?.y;
  const staticSide = SIDE_MAP[placement.split('-')[0]] ?? 'left';

  return (
    <div
      ref={refs.setFloating}
      style={{
        ...floatingStyles,
        // Hide completely until we have a computed anchor position.
        // This prevents a flash at (0,0) before the reference is found.
        visibility: anchored ? 'visible' : 'hidden',
      }}
      className="guide-tooltip"
    >
      {/* Arrow pointing at the reference element */}
      <div
        ref={arrowRef}
        className="guide-arrow"
        style={{
          left:   arrowX != null ? `${arrowX}px` : '',
          top:    arrowY != null ? `${arrowY}px` : '',
          [staticSide]: '-6px',
        }}
      />

      <div className="guide-header">
        <span className="guide-step-badge">Paso {stepIndex + 1} / {totalSteps}</span>
        <button className="guide-close" onClick={skip} aria-label="Cerrar guía">×</button>
      </div>

      <div className="guide-body">
        {step.icon && <span className="guide-icon">{step.icon}</span>}
        <p className="guide-message">{step.message}</p>
      </div>

      <div className="guide-footer">
        <button className="guide-btn-skip" onClick={skip}>Omitir</button>
        <button className="guide-btn-next" onClick={advance}>
          {stepIndex + 1 >= totalSteps ? 'Finalizar' : 'Siguiente →'}
        </button>
      </div>
    </div>
  );
}
