
import { useEffect, useRef, useState } from "react";
import { useTriggerRegistry } from "./TriggerRegistryContext";
import {
  createRegisteredClickTrigger,
  type ClickCountTriggerConfig,
  type RegisteredTrigger,
} from "./triggerRegistry";

export function useRegisteredClickTrigger(
  id: string,
  config: ClickCountTriggerConfig,
) {
  const registry = useTriggerRegistry();

  const initialTriggerRef = useRef<RegisteredTrigger | null>(null);

  if (initialTriggerRef.current === null) {
    initialTriggerRef.current =
      registry.get(id) ?? createRegisteredClickTrigger(id, config);
  }

  const initialTrigger = initialTriggerRef.current;
  const [trigger, setTrigger] = useState(initialTrigger);

  useEffect(() => {
    if (!registry.has(id)) {
      registry.register(initialTrigger);
    }
  }, [registry, id, initialTrigger]);

  function advance() {
    if (!registry.has(id)) {
      registry.register(initialTrigger);
    }

    const updatedTrigger = registry.advance(id);
    setTrigger(updatedTrigger);

    return updatedTrigger;
  }

  function reset() {
    if (!registry.has(id)) {
      registry.register(initialTrigger);
    }

    const resetTrigger = registry.reset(id);
    setTrigger(resetTrigger);

    return resetTrigger;
  }

  return {
    trigger,
    advance,
    reset,
  };
}
