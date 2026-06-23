/** How often to pull the latest IoT packet (ms) */
export const PACKET_REFRESH_MS = 7_000;

/** Set in `.env` as VITE_PACKET_API_URL to enable live polling */
export const PACKET_API_URL = import.meta.env.VITE_PACKET_API_URL as string | undefined;
