import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { PreferencesProvider } from "./preferences/PreferencesContext";
import { TriggerRegistryProvider } from "./engine/TriggerRegistryContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <PreferencesProvider>
      <TriggerRegistryProvider>
        <App />
      </TriggerRegistryProvider>
    </PreferencesProvider>
  </React.StrictMode>,
);