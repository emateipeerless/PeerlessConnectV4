/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LOGIN_API_URL: string;
  readonly VITE_VIEW_API_URL: string;
  readonly VITE_CREATE_USER_API_URL: string;
  readonly VITE_ONBOARDING_API_URL: string;
  readonly VITE_PACKET_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
