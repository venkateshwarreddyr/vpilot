# vpilot 🤖

AI browser copilot Chrome extension — reads pages, acts across tabs, and completes multi-step tasks autonomously. Inspired by Claude for Chrome.

**LLM providers supported:** Anthropic Claude · OpenAI GPT · xAI Grok

---

## Project Structure

```
vpilot/
├── extension/          Chrome MV3 extension (React + Vite + TypeScript)
├── backend/            Python FastAPI backend (Azure Functions serverless)
├── infra/              Azure Bicep infrastructure-as-code
└── .github/workflows/  CI/CD pipelines
```

---

## Quick Start (Local Dev)

### 1. Backend

```bash
cd backend

# Create virtual environment
python3.12 -m venv .venv && source .venv/bin/activate

# Install dependencies
pip install -e ".[test,dev]"

# Configure secrets (edit local.settings.json)
# Set ANTHROPIC_API_KEY / OPENAI_API_KEY / XAI_API_KEY as needed
# VPILOT_API_KEY defaults to "dev-key"

# Run with Azure Functions Core Tools
func start
# → API running at http://localhost:7071/api/

# OR run with uvicorn (simpler for dev)
uvicorn vpilot.app:app --reload --port 7071
```

### 2. Extension

```bash
cd extension

npm install
npm run dev   # watch mode — rebuilds on file change
```

Load in Chrome:
1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select `extension/dist/`
4. Click the vpilot icon → **Open Side Panel**
5. Enter your API key in Settings

### 3. Configure Extension Settings

- **Provider**: Anthropic / OpenAI / xAI
- **Model**: e.g. `claude-sonnet-4-6`
- **API Key**: your LLM provider key
- **Backend URL**: `http://localhost:7071`
- **Backend API Key**: `dev-key` (default for local)

---

## Features

| Feature | Description |
|---|---|
| 💬 Chat UI | Side panel chat with markdown rendering |
| 📄 Page Reader | Extracts text, headings, tables, forms from any page |
| ⚡ Action Engine | Click, type, scroll, navigate, extract on any page |
| ▶▶ Act Without Asking | Autonomous multi-step execution (up to 200 steps) |
| 🗂 Cross-Tab Synthesis | Pull & combine data from all open tabs |
| 📷 Screenshot Analysis | Vision analysis of the current tab |
| 🔀 Multi-LLM | Anthropic · OpenAI · xAI — switchable in settings |
| 💾 Context Memory | Conversation history in Azure Cosmos DB |

---

## Architecture

```
Chrome Extension (React + Vite)
  ├── Side Panel → Chat UI (React)
  ├── Service Worker → Agent loop orchestrator
  ├── extractor.ts → DOM → structured JSON
  └── actor.ts → execute browser actions

Azure Functions Backend (Python + FastAPI)
  ├── POST /api/chat        → LLM conversation (1 turn)
  ├── POST /api/synthesize  → Multi-tab data merge
  ├── POST /api/screenshot  → Vision analysis
  └── GET  /api/health      → Health check

Azure Infrastructure (free/pay-per-use)
  ├── Azure Functions Consumption Plan  → ~$0 (1M free calls/month)
  ├── Azure Cosmos DB Free Tier         → $0 (1000 RU/s + 25GB)
  └── Azure Blob Storage LRS            → ~$0.018/GB/month
```

The **agent loop runs in the service worker** (client-side). The backend is stateless per-request — the extension sends the full message history each turn.

---

## Deploy to Azure

### Prerequisites
- Azure CLI: `brew install azure-cli`
- Azure Functions Core Tools: `brew tap azure/functions && brew install azure-azure-functions-core-tools@4`
- An Azure account (free tier available)

### One-time infrastructure setup

```bash
# Login
az login

# Create resource group
az group create --name vpilot-rg --location eastus

# Deploy Bicep
az deployment group create \
  --resource-group vpilot-rg \
  --template-file infra/main.bicep \
  --parameters infra/parameters/dev.bicepparam \
  --parameters vpilotApiKey=<your-secret-key> \
  --parameters anthropicApiKey=<your-anthropic-key>
```

### Deploy backend

```bash
cd backend
func azure functionapp publish <your-function-app-name>
```

### GitHub Actions (automated deploy on push)

Add these secrets to your GitHub repo:
- `AZURE_CLIENT_ID` — Service principal client ID
- `AZURE_TENANT_ID` — Azure tenant ID
- `AZURE_SUBSCRIPTION_ID` — Azure subscription ID
- `AZURE_FUNCTION_APP_NAME` — Function App name
- `AZURE_FUNCTION_APP_URL` — Function App URL

---

## Development

### Run backend tests

```bash
cd backend
pytest tests/unit -v
```

### Lint & type check

```bash
cd backend
ruff check src tests
mypy src --ignore-missing-imports
```

### Build extension for production

```bash
cd extension
npm run build
# Produces extension/dist/ — load as unpacked or zip for Chrome Web Store
```

---

## Cost Estimate

| Service | Plan | Monthly Cost |
|---|---|---|
| Azure Functions | Consumption | Free (1M calls/month) |
| Azure Cosmos DB | Free Tier | $0 |
| Azure Blob Storage | LRS Hot | ~$0.02/GB |
| **Total** | | **< $1/month** |

At 10,000 chat requests/month with average 5 LLM turns = 50,000 Function invocations → still within the free tier.
