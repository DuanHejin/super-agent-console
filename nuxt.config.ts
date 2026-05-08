export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  typescript: {
    strict: true,
    typeCheck: false
  },
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    arkApiKey: process.env.ARK_API_KEY,
    arkModelId: process.env.ARK_MODEL_ID,
    arkBaseUrl: process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
    logLevel: process.env.LOG_LEVEL || 'info',
    mockModelEnabled: process.env.MOCK_MODEL_ENABLED !== 'false',
    demoServerToken: process.env.DEMO_SERVER_TOKEN,
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
