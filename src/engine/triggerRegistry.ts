
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

/**
 * Stores independent trigger states by their unique IDs.
 */
export class TriggerRegistry {
  private triggers = new Map<string, RegisteredTrigger>();

  register(trigger: RegisteredTrigger): void {
    if (this.triggers.has(trigger.id)) {
      throw new Error(`Trigger "${trigger.id}" is already registered.`);
    }

    this.triggers.set(trigger.id, trigger);
  }

  get(id: string): RegisteredTrigger | undefined {
    return this.triggers.get(id);
  }

  advance(id: string): RegisteredTrigger {
    const trigger = this.triggers.get(id);

    if (!trigger) {
      throw new Error(`Trigger "${id}" is not registered.`);
    }

    const updatedTrigger = advanceRegisteredTrigger(trigger);
    this.triggers.set(id, updatedTrigger);

    return updatedTrigger;
  }

  has(id: string): boolean {
    return this.triggers.has(id);
  }

  getAll(): RegisteredTrigger[] {
    return Array.from(this.triggers.values());
  }

  reset(id: string): RegisteredTrigger {
    const trigger = this.triggers.get(id);

    if (!trigger) {
      throw new Error(`Trigger "${id}" is not registered.`);
    }

    const resetTrigger = createRegisteredClickTrigger(
      trigger.id,
      trigger.config,
    );

    this.triggers.set(id, resetTrigger);

    return resetTrigger;
  }
}
