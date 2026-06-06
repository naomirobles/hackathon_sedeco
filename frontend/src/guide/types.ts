export interface GuideStep {
  id: string;
  targetId: string;
  message: string;
  icon?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export interface GuideState {
  active: boolean;
  currentStep: number;
  completed: boolean;
}

export type GuideAction =
  | { type: 'NEXT' }
  | { type: 'SKIP' }
  | { type: 'COMPLETE' }
  | { type: 'RESET' };
