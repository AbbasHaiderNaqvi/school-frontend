// Server-only: the real backend origin. Used by the proxy route and by
// server-side metadata that needs to reach the backend directly.
export const API_BASE_URL = (process.env.API_BASE_URL || 'https://indigo-vulture-707295.hostingersite.com').replace(/\/$/, '')
