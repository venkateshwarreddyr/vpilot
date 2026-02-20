targetScope = 'resourceGroup'

@description('Environment name (dev, prod)')
param env string = 'dev'

@description('Azure region')
param location string = resourceGroup().location

@description('venkat_pilot backend API key')
@secure()
param venkatPilotApiKey string

@description('Anthropic API key (optional)')
@secure()
param anthropicApiKey string = ''

@description('OpenAI API key (optional)')
@secure()
param openaiApiKey string = ''

@description('xAI API key (optional)')
@secure()
param xaiApiKey string = ''

var prefix = 'venkatpilot${env}'

// ── Storage (required for Functions + screenshots) ────────────────────────────
module storage 'modules/storage.bicep' = {
  name: 'storage'
  params: {
    name: '${prefix}stor'
    location: location
  }
}

// ── Cosmos DB ─────────────────────────────────────────────────────────────────
module cosmos 'modules/cosmos.bicep' = {
  name: 'cosmos'
  params: {
    name: '${prefix}-cosmos'
    location: location
  }
}

// ── Azure Functions ───────────────────────────────────────────────────────────
module functions 'modules/functions.bicep' = {
  name: 'functions'
  params: {
    name: '${prefix}-func'
    location: location
    storageConnectionString: storage.outputs.connectionString
    cosmosEndpoint: cosmos.outputs.endpoint
    cosmosKey: cosmos.outputs.primaryKey
    blobConnectionString: storage.outputs.connectionString
    venkatPilotApiKey: venkatPilotApiKey
    anthropicApiKey: anthropicApiKey
    openaiApiKey: openaiApiKey
    xaiApiKey: xaiApiKey
  }
}

output functionAppUrl string = functions.outputs.url
output functionAppName string = functions.outputs.name
