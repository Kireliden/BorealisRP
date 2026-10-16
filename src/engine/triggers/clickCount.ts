
export interface ClickCountTrigger {
  requiredClicks: number;
  currentClicks: number;
  completed: boolean;
}

export function createClickCountTrigger(
  requiredClicks: number,
): ClickCountTrigger {
  if (!Number.isInteger(requiredClicks) || requiredClicks < 1) {
    throw new Error("requiredClicks must be a positive integer.");
  }

  return {
    requiredClicks,
    currentClicks: 0,
    completed: false,
  };
}

export function advanceClickCountTrigger(
  trigger: ClickCountTrigger,
): ClickCountTrigger {
  if (trigger.completed) {
    return trigger;
  }

  const currentClicks = trigger.currentClicks + 1;

  return {
    ...trigger,
    currentClicks,
    completed: currentClicks >= trigger.requiredClicks,
  };
}
