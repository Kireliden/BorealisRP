
import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
} from "react";
import { TriggerRegistry } from "./triggerRegistry";

const TriggerRegistryContext = createContext<TriggerRegistry | null>(null);

export function TriggerRegistryProvider({
  children,
}: PropsWithChildren) {
  const [registry] = useState(() => new TriggerRegistry());

  return (
    <TriggerRegistryContext.Provider value={registry}>
      {children}
    </TriggerRegistryContext.Provider>
  );
}

export function useTriggerRegistry(): TriggerRegistry {
  const registry = useContext(TriggerRegistryContext);

  if (!registry) {
    throw new Error(
      "useTriggerRegistry must be used inside TriggerRegistryProvider.",
    );
  }

  return registry;
}
