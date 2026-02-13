# mcp-launcher

🚀 **Deploy MCP (Model Context Protocol) servers to Google Cloud Run with a beautiful web dashboard**

## Features

- 🎛️ **Interactive Web Dashboard** - Visual interface for managing deployments
- ☁️ **One-Click Cloud Run Deployments** - Deploy MCP servers in seconds
- 📊 **Real-time Logs & Metrics** - Monitor your deployments with live updates
- 🔧 **Built-in Templates** - Start with a working MCP server template
- 🔄 **Live Deployment Tracking** - Watch your deployment progress in real-time

## Prerequisites

Before using mcp-launcher, ensure you have:

1. **Node.js 18+** installed
2. **Google Cloud SDK** (`gcloud`) installed and authenticated
3. **Docker** installed and running
4. **GCP Project** with billing enabled
5. **Anthropic API Key** (optional, for agent/audit features)

### GCP Setup

```bash
# Install gcloud CLI
# https://cloud.google.com/sdk/docs/install

# Authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com
```

## Installation

### Using npx (Recommended)

```bash
npx mcp-launcher
```

### Global Installation

```bash
npm install -g mcp-launcher
mcp-launcher
```

### Local Development

```bash
git clone <repository-url>
cd mcp-launcher
npm install
cd src/frontend && npm install && cd ../..
npm run build
npm start
```

## Usage

### Interactive Mode (Recommended)

Simply run the launcher and follow the prompts:

```bash
npx mcp-launcher
```

The CLI will:
1. Check prerequisites (gcloud, docker)
2. Prompt for your Google Cloud Project ID (if not already configured)
3. Optionally ask for your Anthropic API Key
4. Offer to save configuration to a `.env` file
5. Launch the web dashboard at `http://localhost:3000`

### Command Line Options

```bash
# With all options specified
npx mcp-launcher --project my-project-id --api-key sk-ant-...

# Save configuration for future runs
npx mcp-launcher --project my-project-id --save-config

# Run on a different port without opening browser
npx mcp-launcher --port 8080 --no-browser

# Show help
npx mcp-launcher --help

# Show version
npx mcp-launcher --version
```

### Configuration Methods

The launcher looks for configuration in this order:
1. **Command line flags** (highest priority)
2. **Environment variables**
3. **Existing .env file** in current directory
4. **Interactive prompts** (if not in CI mode)

### Configuration File

You can also create a `.env` file manually:

```env
# Required
GOOGLE_PROJECT_ID=your_gcp_project_id

# Optional (for agent features)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Optional (defaults shown)
PORT=3000
CI=false
```

## Deploying Your MCP Server

Once the dashboard is running:

1. **Select your project** - Use the built-in template or browse to your MCP server directory
2. **Configure deployment** - Review the GCP project settings
3. **Click Deploy** - Watch real-time progress in the dashboard
4. **Get your URL** - Your MCP server will be live on Cloud Run!

## Project Structure

```
mcp-launcher/
├── bin/                  # CLI entry point
├── src/
│   ├── server/          # Express + Socket.io backend
│   ├── frontend/        # React/Vite dashboard
│   ├── orchestrator/    # Deployment pipeline
│   ├── gcp/             # GCP integrations
│   ├── agent/           # Agent/audit functionality
│   └── config/          # Configuration management
├── template/            # MCP server template
│   ├── math_bot.py      # Example FastMCP server
│   ├── Dockerfile
│   ├── Makefile
│   └── pyproject.toml
├── public/              # Built frontend assets
└── dist/                # Compiled TypeScript
```

## Configuration

### CLI Flags

| Flag | Short | Description |
|------|-------|-------------|
| `--project <id>` | `-p` | Google Cloud Project ID |
| `--api-key <key>` | `-k` | Anthropic API Key (optional) |
| `--port <number>` | | Server port (default: 3000) |
| `--no-browser` | | Don't open browser automatically |
| `--save-config` | `-s` | Save configuration to .env file |
| `--ci` | | Run in non-interactive mode |
| `--help` | `-h` | Show help message |
| `--version` | `-v` | Show version number |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_PROJECT_ID` | Yes | Your GCP project ID |
| `ANTHROPIC_API_KEY` | No | Your Anthropic API key for agent features |
| `PORT` | No | Server port (default: 3000) |
| `CI` | No | Set to `true` to disable browser auto-open |

### Frontend Development

```bash
cd src/frontend
npm install
npm run dev        # Vite dev server on port 5173
npm run build      # Build for production
```

## Deployment Process

The launcher automates these steps:

1. **GCP Setup** - Enables required APIs and creates Artifact Registry
2. **Docker Build** - Builds container image for your MCP server
3. **Push to Registry** - Pushes image to Google Artifact Registry
4. **Cloud Run Deploy** - Deploys to Cloud Run with auto-scaling
5. **Verification** - Confirms deployment and captures service URL

## Template

The included template (`template/`) provides a working MCP server:

- **FastMCP** - Modern Python MCP framework
- **HTTP Transport** - Ready for Cloud Run
- **Tools** - Example `add` tool
- **Resources** - Dynamic greeting resources
- **Prompts** - Configurable greeting prompts

Customize `template/math_bot.py` to create your own MCP server!

## Troubleshooting

### Docker not running
```bash
# macOS
open -a Docker

# Linux
sudo systemctl start docker
```

### gcloud not authenticated
```bash
gcloud auth login
gcloud auth configure-docker
```

### Permission denied
```bash
# Ensure you have the right GCP permissions
# Required roles: Cloud Run Admin, Artifact Registry Admin, Service Account User
```

## Development

```bash
# Install dependencies
npm install
cd src/frontend && npm install

# Build everything
npm run build

# Run in development mode (backend only)
npm run dev

# Run frontend dev server
cd src/frontend && npm run dev
```

## License

ISC

## Contributing

Contributions welcome! Please read our contributing guidelines and submit PRs.
