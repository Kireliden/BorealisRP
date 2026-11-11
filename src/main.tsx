import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { PreferencesProvider } from "./preferences/PreferencesContext";
import { TriggerRegistryProvider } from "./engine/TriggerRegistryContext";
import { AppDialogProvider } from "./ui/AppDialogProvider";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <PreferencesProvider>
      <AppDialogProvider>
        <TriggerRegistryProvider>
          <App />
        </TriggerRegistryProvider>
      </AppDialogProvider>
    </PreferencesProvider>
  </React.StrictMode>,
);