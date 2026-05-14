export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  typescript: {
    strict: true,
    typeCheck: false
  },
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    modelProvider: process.env.MODEL_PROVIDER || 'mock',
    modelName: process.env.MODEL_NAME || 'doubao-seed-2-0-lite-260428',
    modelBaseUrl: process.env.MODEL_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
    modelApiKey: process.env.MODEL_API_KEY,
    modelEnabled: process.env.MODEL_ENABLED !== 'false',
    modelTemperature: process.env.MODEL_TEMPERATURE || '0.2',
    modelTopP: process.env.MODEL_TOP_P || '0.8',
    modelMaxTokens: process.env.MODEL_MAX_TOKENS || '4096',
    logLevel: process.env.LOG_LEVEL || 'info',
    mockModelEnabled: process.env.MOCK_MODEL_ENABLED !== 'false',
    demoServerToken: process.env.DEMO_SERVER_TOKEN,
    accessCodes: process.env.ACCESS_CODES || '',
    adminAccessCodes: process.env.ADMIN_ACCESS_CODES || '',
    authCookieSecret: process.env.AUTH_COOKIE_SECRET || '',
    runRateLimitMinute: process.env.RUN_RATE_LIMIT_MINUTE || '3',
    runRateLimitDay: process.env.RUN_RATE_LIMIT_DAY || '30',
    globalRunRateLimitMinute: process.env.GLOBAL_RUN_RATE_LIMIT_MINUTE || '5',
    globalRunRateLimitDay: process.env.GLOBAL_RUN_RATE_LIMIT_DAY || '100',
    concurrentRunsPerUser: process.env.CONCURRENT_RUNS_PER_USER || '1',
    concurrentRunsGlobal: process.env.CONCURRENT_RUNS_GLOBAL || '3',
    authLoginRateLimitMinute: process.env.AUTH_LOGIN_RATE_LIMIT_MINUTE || '10',
    modelRequestTimeoutMs: process.env.MODEL_REQUEST_TIMEOUT_MS || '60000',
    maxRunInputLength: process.env.MAX_RUN_INPUT_LENGTH || '5000',
    public: {
      appName: process.env.NUXT_PUBLIC_APP_NAME || process.env.APP_NAME || 'super-agent-console',
      appVersion: process.env.NUXT_PUBLIC_APP_VERSION || process.env.APP_VERSION || '0.1.0',
      deployEnv: process.env.NUXT_PUBLIC_DEPLOY_ENV || 'local',
      configDemoText: process.env.NUXT_PUBLIC_CONFIG_DEMO_TEXT || 'config-demo-not-set',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      nodeEnv: process.env.NODE_ENV || 'development'
    }
  }
})
