# AGENTS.md - Developer Context

## Project Overview

**mcp-launcher** is a CLI tool and web dashboard for deploying MCP (Model Context Protocol) servers to Google Cloud Run.

## Architecture

### Backend (`src/server/`)
- **Express + Socket.io** server on port 3000
- Serves static frontend from `public/` directory
- Real-time communication via WebSockets for deployment progress

### Frontend (`src/frontend/`)
- **Svelte + Vite** application
- **Tailwind CSS** for styling
- **Socket.io-client** for real-time updates
- **Lucide icons** for UI elements

### Deployment Pipeline (`src/orchestrator/`)
- Runs `make gcp-setup` to enable APIs and create registry
- Runs `make deploy` to build, push, and deploy
- Captures Cloud Run service URL from gcloud output
- Streams logs back to frontend via Socket.io

## Key Commands

```bash
# Development
npm run dev              # Start backend with ts-node
cd src/frontend && npm run dev  # Start frontend dev server

# Building
npm run build            # Build both backend and frontend
npm run build:server     # Build TypeScript only
npm run build:frontend   # Build Vite frontend

# Production
npm start                # Run compiled backend
npx mcp-launcher         # Run via npx (uses bin/deploy-mcp.js)
```

## File Structure

```
src/
├── server/index.ts      # Main Express server
├── server/socket.ts     # Socket.io handlers
├── server/mcpClient.ts  # MCP client for testing deployed servers
├── orchestrator/runner.ts   # Deployment orchestration
├── gcp/                 # GCP API integrations
│   ├── logs.ts
│   ├── metrics.ts
│   ├── service.ts
│   └── verification.ts
├── agent/               # Agent/audit functionality
├── config/              # Configuration types
└── frontend/            # Svelte dashboard
    ├── src/
    │   ├── lib/
    │   │   ├── components/   # UI components
    │   │   ├── pages/        # Page components
    │   │   ├── services/     # API services
    │   │   ├── stores/       # Svelte stores
    │   │   └── types/        # TypeScript types
    │   └── main.ts
    └── vite.config.ts

template/                # MCP server template
├── math_bot.py          # Example FastMCP server
├── Dockerfile           # Container definition
├── Makefile             # Deployment commands
└── pyproject.toml       # Python dependencies
```

## Environment Variables

Required:
- `ANTHROPIC_API_KEY` - For agent/audit features
- `GOOGLE_PROJECT_ID` - GCP project for deployment

Optional:
- `PORT` - Server port (default: 3000)
- `CI` - Disable browser auto-open when true

## Build Process

1. TypeScript compiles `src/` to `dist/`
2. Vite builds frontend to `src/frontend/dist/`
3. Frontend assets copied to `public/`
4. Package published with `files` array controlling contents

## Publishing to npm

```bash
npm run build
npm version [patch|minor|major]
npm publish
```

The `bin` field in package.json registers two commands:
- `mcp-launcher`
- `deploy-mcp`

Both point to `bin/deploy-mcp.js` which checks for compiled code or runs via ts-node.

## MCP Client Testing Features

The dashboard includes a full MCP client for testing deployed servers:

### Discovery (`mcpClient.ts`)
- **inspectMcpServer()** - Connects to MCP endpoint and discovers:
  - Available tools with input schemas
  - Resources and resource templates
  - Prompts with arguments
  - Server capabilities and transport type (streamable-http or SSE)

### Tool Invocation
- **invokeMcpTool()** - Calls tools on the deployed MCP server
- Auto-generates sample arguments from JSON schema
- Displays results with content type handling (text, images, etc.)

### Resource Reading
- **readMcpResource()** - Fetches resource content by URI
- Supports dynamic resources via URI templates

### Prompt Fetching
- **getMcpPrompt()** - Retrieves prompt templates with arguments
- Displays messages with role indicators (user/assistant)

### UI Components (ServerDetailsPage.svelte)
- **MCP Client Tab** - Main interface for testing
  - Connect to any MCP endpoint URL
  - Custom headers support (for auth)
  - Tool list with "Invoke" buttons
  - Resource list with "Read" buttons
  - Prompt list with "Get Prompt" buttons
- **Modals** - Interactive dialogs for:
  - Tool invocation with JSON argument editor
  - Resource content display
  - Prompt message viewing

## Dependencies

- **Backend**: Express, Socket.io, Google Cloud SDKs, @modelcontextprotocol/sdk, execa, dotenv
- **Frontend**: Svelte, Vite, Tailwind, Socket.io-client, lucide-svelte
- **Dev**: TypeScript, ts-node, @types/*

## Notes

- The `.env` file is loaded via dotenv in server startup
- Frontend must be built before publishing (public/ directory)
- Template directory included in npm package for new projects
- Docker and gcloud CLI must be installed on user machine
