param name string
param location string
// SWA free tier doesn't support all regions — use supported ones
param swaLocation string = 'eastus2'
param repositoryUrl string = ''
param branch string = 'main'

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: name
  // SWA has limited region support; eastus2 is broadly available
  location: swaLocation
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    repositoryUrl: repositoryUrl
    branch: branch
    buildProperties: {
      appLocation: 'web'
      outputLocation: ''      // static HTML — no build step needed
      appArtifactLocation: '' // same as outputLocation for static sites
    }
  }
}

output defaultHostname string = staticWebApp.properties.defaultHostname
output name string = staticWebApp.name
output deploymentToken string = staticWebApp.listSecrets().properties.apiKey
