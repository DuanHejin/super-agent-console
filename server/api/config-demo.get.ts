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
      modelProvider: config.modelProvider,
      modelName: config.modelName,
      modelBaseUrl: config.modelBaseUrl,
      logLevel: config.logLevel,
      mockModelEnabled: config.mockModelEnabled,
      databaseUrlLoaded: Boolean(config.databaseUrl),
      modelApiKeyLoaded: Boolean(config.modelApiKey),
      demoServerTokenLoaded: Boolean(config.demoServerToken)
    }
  }
})
