import { getAppRuntimeConfig } from '../utils/runtime-config'

export default defineEventHandler(() => {
  const config = getAppRuntimeConfig()

  return {
    publicConfig: {
      appName: config.appName,
      appVersion: config.appVersion,
      deployEnv: config.deployEnv,
      configDemoText: config.configDemoText,
      siteUrl: config.siteUrl,
      nodeEnv: config.nodeEnv
    },
    serverOnlyConfig: {
      modelEnabled: config.modelEnabled,
      modelProviderLoaded: Boolean(config.modelProvider),
      modelNameLoaded: Boolean(config.modelName),
      modelBaseUrlLoaded: Boolean(config.modelBaseUrl),
      databaseUrlLoaded: Boolean(config.databaseUrl),
      modelApiKeyLoaded: Boolean(config.modelApiKey),
      accessCodesCount: config.accessCodes.split(',').map((code) => code.trim()).filter(Boolean).length,
      adminAccessCodesCount: config.adminAccessCodes.split(',').map((code) => code.trim()).filter(Boolean).length,
      authCookieSecretLoaded: Boolean(config.authCookieSecret),
      demoServerTokenLoaded: Boolean(config.demoServerToken)
    }
  }
})
