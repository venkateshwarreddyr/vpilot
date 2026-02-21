param name string
// Cosmos DB free tier capacity varies by region — westus2 has reliable availability
param location string = 'westus2'

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: name
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [{ locationName: location, failoverPriority: 0 }]
    consistencyPolicy: { defaultConsistencyLevel: 'Session' }
    // Free tier: 1000 RU/s + 25 GB — only 1 free tier account per subscription
    enableFreeTier: true
    capabilities: [{ name: 'EnableServerless' }]
  }
}

resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-05-15' = {
  parent: cosmosAccount
  name: 'vpilot'
  properties: {
    resource: { id: 'vpilot' }
  }
}

resource conversationsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'conversations'
  properties: {
    resource: {
      id: 'conversations'
      partitionKey: { paths: ['/session_id'], kind: 'Hash' }
      defaultTtl: 2592000 // 30 days
    }
  }
}

resource userContextContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'user_context'
  properties: {
    resource: {
      id: 'user_context'
      partitionKey: { paths: ['/device_id'], kind: 'Hash' }
    }
  }
}

output endpoint string = cosmosAccount.properties.documentEndpoint
output primaryKey string = cosmosAccount.listKeys().primaryMasterKey
output accountName string = cosmosAccount.name
