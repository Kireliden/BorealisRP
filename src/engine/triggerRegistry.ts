
import {
  advanceClickCountTrigger,
  createClickCountTrigger,
  type ClickCountTrigger,
} from "./triggers/clickCount";

export interface ClickCountTriggerConfig {
  type: "click-count";
  requiredClicks: number;
}

export interface RegisteredTrigger {
  id: string;
  config: ClickCountTriggerConfig;
  state: ClickCountTrigger;
}

export function createRegisteredClickTrigger(
  id: string,
  config: ClickCountTriggerConfig,
): RegisteredTrigger {
  if (!id.trim()) {
    throw new Error("Trigger id cannot be empty.");
  }

  return {
    id,
    config,
    state: createClickCountTrigger(config.requiredClicks),
  };
}

export function advanceRegisteredTrigger(
  trigger: RegisteredTrigger,
): RegisteredTrigger {
  return {
    ...trigger,
    state: advanceClickCountTrigger(trigger.state),
  };
}
