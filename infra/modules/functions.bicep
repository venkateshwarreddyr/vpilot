param name string
param location string
param storageConnectionString string
param cosmosEndpoint string
param cosmosKey string
param blobConnectionString string
@secure()
param vpilotApiKey string
@secure()
param anthropicApiKey string
@secure()
param openaiApiKey string
@secure()
param xaiApiKey string

// Log Analytics workspace (required by Container Apps Environment)
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${name}-logs'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

// Container Apps Environment
resource containerEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${name}-env'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// Container App — Python FastAPI backend
resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: name
  location: location
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8000
        transport: 'auto'
        corsPolicy: {
          allowedOrigins: ['chrome-extension://*', 'https://portal.azure.com']
          allowCredentials: false
          allowedMethods: ['GET', 'POST', 'OPTIONS']
          allowedHeaders: ['*']
        }
      }
      secrets: [
        { name: 'vpilot-api-key', value: vpilotApiKey }
        { name: 'anthropic-api-key', value: empty(anthropicApiKey) ? 'not-set' : anthropicApiKey }
        { name: 'openai-api-key', value: empty(openaiApiKey) ? 'not-set' : openaiApiKey }
        { name: 'xai-api-key', value: empty(xaiApiKey) ? 'not-set' : xaiApiKey }
        { name: 'cosmos-key', value: cosmosKey }
        { name: 'storage-conn', value: storageConnectionString }
        { name: 'blob-conn', value: blobConnectionString }
      ]
    }
    template: {
      containers: [
        {
          name: 'backend'
          // Initial placeholder — will be replaced on first deploy via az containerapp up
          image: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            { name: 'COSMOS_ENDPOINT', value: cosmosEndpoint }
            { name: 'COSMOS_KEY', secretRef: 'cosmos-key' }
            { name: 'BLOB_CONNECTION_STRING', secretRef: 'blob-conn' }
            { name: 'VPILOT_API_KEY', secretRef: 'vpilot-api-key' }
            { name: 'ANTHROPIC_API_KEY', secretRef: 'anthropic-api-key' }
            { name: 'OPENAI_API_KEY', secretRef: 'openai-api-key' }
            { name: 'XAI_API_KEY', secretRef: 'xai-api-key' }
            { name: 'ALLOWED_ORIGINS', value: 'chrome-extension://*' }
            { name: 'PORT', value: '8000' }
          ]
        }
      ]
      scale: {
        minReplicas: 0   // Scale to zero when idle (free)
        maxReplicas: 2
        rules: [
          {
            name: 'http-rule'
            http: { metadata: { concurrentRequests: '10' } }
          }
        ]
      }
    }
  }
}

output url string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
output name string = containerApp.name
output envName string = containerEnv.name
