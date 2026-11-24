import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { PreferencesProvider } from "./preferences/PreferencesContext";
import { TriggerRegistryProvider } from "./engine/TriggerRegistryContext";
import { AppDialogProvider } from "./ui/AppDialogProvider";
import FirstRunProfile from "./onboarding/FirstRunProfile";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <PreferencesProvider>
      <AppDialogProvider>
        <TriggerRegistryProvider>
          <App />
          <FirstRunProfile />
        </TriggerRegistryProvider>
      </AppDialogProvider>
    </PreferencesProvider>
  </React.StrictMode>,
);