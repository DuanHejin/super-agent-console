export function getAppRuntimeConfig() {
  const config = useRuntimeConfig()

  return {
    appName: config.public.appName,
    appVersion: config.public.appVersion,
    deployEnv: config.public.deployEnv,
    configDemoText: config.public.configDemoText,
    siteUrl: config.public.siteUrl,
    nodeEnv: config.public.nodeEnv,
    databaseUrl: config.databaseUrl,
    demoServerToken: config.demoServerToken,
    arkBaseUrl: config.arkBaseUrl,
    arkModelId: config.arkModelId,
    logLevel: config.logLevel,
    mockModelEnabled: config.mockModelEnabled
  }
}
