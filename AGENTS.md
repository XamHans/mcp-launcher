# AGENTS.md - Developer Context

## Project Overview

**mcp-launcher** is a CLI tool and web dashboard for deploying MCP (Model Context Protocol) servers to Google Cloud Run.

## Architecture

### Backend (`src/server/`)
- **Express + Socket.io** server on port 3000
- Serves static frontend from `public/` directory
- Real-time communication via WebSockets for deployment progress

### Frontend (`src/frontend/`)
- **React + Vite** application
- **Preact** for smaller bundle size
- **Tailwind CSS** for styling
- **Socket.io-client** for real-time updates

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
├── orchestrator/runner.ts   # Deployment orchestration
├── gcp/                 # GCP API integrations
│   ├── logs.ts
│   ├── metrics.ts
│   └── verification.ts
├── agent/               # Agent/audit functionality
├── config/              # Configuration types
├── frontend/            # React dashboard
│   ├── src/app.tsx
│   ├── src/pages/
│   └── vite.config.ts
└── public/              # Built frontend assets (generated)

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

## Dependencies

- **Backend**: Express, Socket.io, Google Cloud SDKs, execa, dotenv
- **Frontend**: React/Preact, Vite, Tailwind, Socket.io-client
- **Dev**: TypeScript, ts-node, @types/*

## Notes

- The `.env` file is loaded via dotenv in server startup
- Frontend must be built before publishing (public/ directory)
- Template directory included in npm package for new projects
- Docker and gcloud CLI must be installed on user machine
