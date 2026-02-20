param name string
param location string
param storageConnectionString string
param cosmosEndpoint string
param cosmosKey string
param blobConnectionString string
@secure() param venkatPilotApiKey string
@secure() param anthropicApiKey string
@secure() param openaiApiKey string
@secure() param xaiApiKey string

// App Service Plan — Consumption (serverless, pay-per-use)
resource hostingPlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${name}-plan'
  location: location
  sku: { name: 'Y1', tier: 'Dynamic' }
  properties: {}
}

resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: name
  location: location
  kind: 'functionapp,linux'
  properties: {
    serverFarmId: hostingPlan.id
    httpsOnly: true
    siteConfig: {
      pythonVersion: '3.12'
      linuxFxVersion: 'Python|3.12'
      functionAppScaleLimit: 10
      appSettings: [
        { name: 'AzureWebJobsStorage', value: storageConnectionString }
        { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' }
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'python' }
        { name: 'COSMOS_ENDPOINT', value: cosmosEndpoint }
        { name: 'COSMOS_KEY', value: cosmosKey }
        { name: 'BLOB_CONNECTION_STRING', value: blobConnectionString }
        { name: 'VENKAT_PILOT_API_KEY', value: venkatPilotApiKey }
        { name: 'ANTHROPIC_API_KEY', value: anthropicApiKey }
        { name: 'OPENAI_API_KEY', value: openaiApiKey }
        { name: 'XAI_API_KEY', value: xaiApiKey }
        { name: 'ALLOWED_ORIGINS', value: 'chrome-extension://*' }
        { name: 'SCM_DO_BUILD_DURING_DEPLOYMENT', value: 'true' }
        { name: 'ENABLE_ORYX_BUILD', value: 'true' }
      ]
      cors: {
        allowedOrigins: ['chrome-extension://*', 'https://portal.azure.com']
        supportCredentials: false
      }
    }
  }
}

output url string = 'https://${functionApp.properties.defaultHostName}'
output name string = functionApp.name
