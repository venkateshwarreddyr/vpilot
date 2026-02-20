using '../main.bicep'

param env = 'dev'
param location = 'eastus'
// Secrets: pass via --parameters flag or Azure Key Vault references
// az deployment group create \
//   --parameters dev.bicepparam \
//   --parameters venkatPilotApiKey=$VENKAT_PILOT_API_KEY \
//   --parameters anthropicApiKey=$ANTHROPIC_API_KEY
