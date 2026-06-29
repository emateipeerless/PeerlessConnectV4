/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LOGIN_API_URL: string;
  readonly VITE_VIEW_API_URL: string;
  readonly VITE_CREATE_USER_API_URL: string;
  readonly VITE_ONBOARDING_API_URL: string;
  readonly VITE_PACKET_API_URL?: string;
  /** Set to "true" to enable Microsoft Entra SSO (easy revert: set false) */
  readonly VITE_SSO_ENABLED?: string;
  readonly VITE_AZURE_CLIENT_ID?: string;
  readonly VITE_AZURE_TENANT_ID?: string;
  /** MSAL authority segment: common | organizations | consumers | tenant-guid */
  readonly VITE_AZURE_AUTHORITY?: string;
  readonly VITE_AZURE_REDIRECT_URI?: string;
  readonly VITE_SSO_LOGIN_API_URL?: string;
  readonly VITE_CREATE_SSO_USER_API_URL?: string;
  readonly VITE_GET_ANALOG_SCALES_API_URL?: string;
  readonly VITE_SAVE_ANALOG_SCALES_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
