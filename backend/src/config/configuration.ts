export default () => ({
  app: {
    name: process.env.APP_NAME ?? 'crypto-sim-backend',
    environment: process.env.NODE_ENV ?? 'development'
  },
  http: {
    host: process.env.HTTP_HOST ?? '0.0.0.0',
    port: parseInt(process.env.HTTP_PORT ?? '3000', 10),
    corsOrigin: process.env.HTTP_CORS_ORIGIN ?? '*'
  },
  database: {
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:password@localhost:5432/crypto_sim'
  },
  auth: {
    skipJwtVerification: process.env.AUTH_SKIP_JWT_VERIFICATION === 'true',
    jwt: {
      accessTokenSecret: process.env.JWT_ACCESS_TOKEN_SECRET ?? 'change-me',
      accessTokenTtl: process.env.JWT_ACCESS_TOKEN_TTL ?? '15m',
      refreshTokenSecret: process.env.JWT_REFRESH_TOKEN_SECRET ?? 'change-me-too',
      refreshTokenTtl: process.env.JWT_REFRESH_TOKEN_TTL ?? '7d'
    },
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10)
  },
  redis: {
    enabled: process.env.REDIS_ENABLED !== 'false', // 默认启用，除非显式设置为 false
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    cacheDb: parseInt(process.env.REDIS_CACHE_DB ?? '0', 10),
    bullmqDb: parseInt(process.env.REDIS_BULLMQ_DB ?? '1', 10),
    sessionDb: parseInt(process.env.REDIS_SESSION_DB ?? '2', 10)
  },
  cache: {
    ttl: parseInt(process.env.CACHE_TTL_SECONDS ?? '60', 10)
  },
  queue: {
    prefix: process.env.QUEUE_PREFIX ?? 'crypto-sim'
  },
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL ?? '60', 10),
    limit: parseInt(process.env.RATE_LIMIT_LIMIT ?? '100', 10)
  },
  mail: {
    host: process.env.MAIL_HOST ?? 'smtp.example.com',
    port: parseInt(process.env.MAIL_PORT ?? '587', 10),
    user: process.env.MAIL_USER ?? 'apikey',
    password: process.env.MAIL_PASSWORD ?? 'secret',
    from: process.env.MAIL_FROM ?? 'no-reply@example.com'
  },
  realtime: {
    priceNamespace: process.env.REALTIME_PRICE_NAMESPACE ?? '/prices',
    orderNamespace: process.env.REALTIME_ORDER_NAMESPACE ?? '/orders'
  },
  marketData: {
    binance: {
      wsBaseUrl: process.env.BINANCE_WS_BASE_URL ?? 'wss://stream.binance.com:9443/ws',
      symbols: (process.env.BINANCE_SYMBOLS ?? 'btcusdt').split(','),
      reconnectDelaySeconds: parseInt(process.env.BINANCE_RECONNECT_DELAY ?? '5', 10)
    },
    coingecko: {
      baseUrl: process.env.COINGECKO_BASE_URL ?? 'https://api.coingecko.com/api/v3',
      pollIntervalSeconds: parseInt(process.env.COINGECKO_POLL_INTERVAL ?? '300', 10)
    }
  },
  frontendIpWhitelist: {
    confPath:
      process.env.FRONTEND_IP_WHITELIST_FILE ??
      '/www/wwwroot/Zenvy_web_frontend/frontend/.ip_whitelist.conf',
    reloadCmd: process.env.NGINX_RELOAD_CMD ?? 'sudo /usr/sbin/nginx -s reload'
  }
});
