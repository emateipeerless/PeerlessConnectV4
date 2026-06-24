/**
 * SSO feature flag and Azure Entra settings.
 * Set VITE_SSO_ENABLED=false in .env to hide SSO UI and skip MSAL (easy revert).
 */

export const SSO_ENABLED = import.meta.env.VITE_SSO_ENABLED === "true";

export function getAzureClientId(): string {
  return import.meta.env.VITE_AZURE_CLIENT_ID ?? "";
}

export function getAzureTenantId(): string {
  return import.meta.env.VITE_AZURE_TENANT_ID ?? "";
}

/** Same-origin redirect URI — matches working SSOEXAMPLE pattern. */
export function getAzureRedirectUri(): string {
  return import.meta.env.VITE_AZURE_REDIRECT_URI || window.location.origin;
}

export function isSsoConfigured(): boolean {
  return SSO_ENABLED && Boolean(getAzureClientId() && getAzureTenantId());
}
