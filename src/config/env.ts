const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export const appConfig = {
  apiUrl: API_URL,
  wsUrl: import.meta.env.VITE_WS_URL ?? 'ws://localhost:3000',
  sentryDsn: import.meta.env.VITE_SENTRY_DSN ?? ''
};
