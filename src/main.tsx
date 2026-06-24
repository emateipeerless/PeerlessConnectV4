import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { EventType, PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import App from "./App";
import { msalConfig } from "./auth/authConfig";
import { SSO_ENABLED } from "./config/sso";
import { ThemeProvider } from "./theme/ThemeContext";
import "./theme/theme.css";
import "./index.css";
import "./device-dashboard.css";

const app = (
  <ThemeProvider>
    <App />
  </ThemeProvider>
);

if (SSO_ENABLED) {
  const msalInstance = new PublicClientApplication(msalConfig);

  msalInstance.initialize().then(async () => {
    await msalInstance.handleRedirectPromise();

    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      msalInstance.setActiveAccount(accounts[0]);
    }

    msalInstance.addEventCallback((event) => {
      if (
        event.eventType === EventType.LOGIN_SUCCESS &&
        event.payload &&
        "account" in event.payload &&
        event.payload.account
      ) {
        msalInstance.setActiveAccount(event.payload.account);
      }
    });

    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <MsalProvider instance={msalInstance}>
          {app}
        </MsalProvider>
      </StrictMode>,
    );
  });
} else {
  createRoot(document.getElementById("root")!).render(<StrictMode>{app}</StrictMode>);
}
