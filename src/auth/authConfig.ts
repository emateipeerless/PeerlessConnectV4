import { LogLevel, type Configuration } from "@azure/msal-browser";
import { getAzureClientId, getAzureRedirectUri, getAzureTenantId } from "../config/sso";

const clientId = getAzureClientId();
const tenantId = getAzureTenantId();
const redirectUri = getAzureRedirectUri();

export const msalConfig: Configuration = {
  auth: {
    clientId: clientId || "YOUR_CLIENT_ID",
    authority: `https://login.microsoftonline.com/${tenantId || "YOUR_TENANT_ID"}`,
    redirectUri,
    postLogoutRedirectUri: redirectUri,
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        if (level === LogLevel.Error) {
          console.error(message);
        } else if (level === LogLevel.Warning) {
          console.warn(message);
        }
      },
    },
  },
};

export const loginRequest = {
  scopes: ["User.Read"],
};
