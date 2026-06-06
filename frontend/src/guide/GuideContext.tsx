import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { GuideState, GuideAction } from './types';
import { GUIDE_STEPS } from './steps';

const STORAGE_KEY = 'guide_v2';

const initialState: GuideState = {
  active: true,
  currentStep: 0,
  completed: false,
};

function guideReducer(state: GuideState, action: GuideAction): GuideState {
  switch (action.type) {
    case 'NEXT':
      if (state.currentStep >= GUIDE_STEPS.length - 1) {
        return { ...state, active: false, completed: true };
      }
      return { ...state, currentStep: state.currentStep + 1 };
    case 'SKIP':
    case 'COMPLETE':
      return { ...state, active: false, completed: true };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

function loadSavedState(): GuideState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as GuideState;
    if (parsed.completed) return { ...initialState, active: false, completed: true };
    return { ...initialState, ...parsed };
  } catch {
    return initialState;
  }
}

interface GuideContextValue {
  state: GuideState;
  dispatch: React.Dispatch<GuideAction>;
  currentStep: typeof GUIDE_STEPS[number] | null;
}

const GuideContext = createContext<GuideContextValue | null>(null);

export function GuideProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(guideReducer, undefined, loadSavedState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const currentStep =
    state.active && !state.completed ? (GUIDE_STEPS[state.currentStep] ?? null) : null;

  return (
    <GuideContext.Provider value={{ state, dispatch, currentStep }}>
      {children}
    </GuideContext.Provider>
  );
}

export function useGuideContext(): GuideContextValue {
  const ctx = useContext(GuideContext);
  if (!ctx) throw new Error('useGuideContext must be used inside <GuideProvider>');
  return ctx;
}
