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

/**
 * MSAL authority — controls WHO can sign in (not just app registration settings).
 *
 * | Value / env              | Who can sign in                          |
 * |--------------------------|------------------------------------------|
 * | common (recommended)     | Any work/school tenant + personal MSA    |
 * | organizations          | Any work/school tenant only              |
 * | consumers              | Personal Microsoft accounts only         |
 * | {your-tenant-guid}       | Single tenant only (your org)            |
 *
 * Set VITE_AZURE_AUTHORITY=common when app registration supports
 * "Any Entra ID tenant + personal Microsoft accounts".
 */
export function getAzureAuthority(): string {
  const configured = import.meta.env.VITE_AZURE_AUTHORITY?.trim();
  if (configured) {
    if (configured.startsWith("https://")) {
      return configured;
    }
    return `https://login.microsoftonline.com/${configured}`;
  }

  const tenantId = getAzureTenantId();
  if (tenantId) {
    return `https://login.microsoftonline.com/${tenantId}`;
  }

  return "https://login.microsoftonline.com/common";
}

/** Same-origin redirect URI — matches working SSOEXAMPLE pattern. */
export function getAzureRedirectUri(): string {
  return import.meta.env.VITE_AZURE_REDIRECT_URI || window.location.origin;
}

export function isSsoConfigured(): boolean {
  return SSO_ENABLED && Boolean(getAzureClientId());
}
