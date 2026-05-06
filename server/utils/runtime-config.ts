export function getAppRuntimeConfig() {
  const config = useRuntimeConfig()

  return {
    appName: config.public.appName,
    appVersion: config.public.appVersion,
    nodeEnv: config.public.nodeEnv,
    databaseUrl: config.databaseUrl,
    arkBaseUrl: config.arkBaseUrl,
    arkModelId: config.arkModelId,
    logLevel: config.logLevel,
    mockModelEnabled: config.mockModelEnabled
  }
}
