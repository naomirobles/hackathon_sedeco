import { useGuideContext } from './GuideContext';
import { GUIDE_STEPS } from './steps';

export function useGuide() {
  const { state, dispatch, currentStep } = useGuideContext();

  const advance  = () => dispatch({ type: 'NEXT' });
  const skip     = () => dispatch({ type: 'SKIP' });
  const complete = () => dispatch({ type: 'COMPLETE' });
  const reset    = () => dispatch({ type: 'RESET' });

  const isStepActive = (stepId: string) =>
    state.active && !state.completed && currentStep?.id === stepId;

  return {
    state,
    currentStep,
    advance,
    skip,
    complete,
    reset,
    isStepActive,
    stepIndex: state.currentStep,
    totalSteps: GUIDE_STEPS.length,
  };
}
