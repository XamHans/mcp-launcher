# mcp-launcher

Deploy MCP servers to Google Cloud Run from a single command.

```bash
npx mcp-launcher
```

[![Demo](https://img.youtube.com/vi/-Aby7F4OBQo/maxresdefault.jpg)](https://youtu.be/-Aby7F4OBQo)

## What it does

MCP Launcher gives you a local web dashboard to build, deploy, and monitor MCP (Model Context Protocol) servers on Google Cloud Run. You point it at your server code, click deploy, and get a live URL.

## What happens when you run it

```
npx mcp-launcher
```

1. **Checks prerequisites** — makes sure `gcloud` and `docker` are installed and running
2. **Asks for your Google Cloud Project ID** — this is the GCP project where your MCP server will be deployed. Cloud Run, Artifact Registry, and Cloud Build all live under this project. You can find it at [console.cloud.google.com](https://console.cloud.google.com)
3. **Asks for your Anthropic API Key** (optional) — used for the built-in agent/audit features. You can skip this and add it later from the dashboard settings
4. **Launches the dashboard** at `http://localhost:3000`

From the dashboard you can:
- Add MCP servers (point to a directory with your code)
- Deploy to Cloud Run with one click
- Monitor health, metrics, and logs in real time
- Inspect and test your MCP tools, resources, and prompts

## Before you start

You need three things installed:

| Tool | Why | Install |
|------|-----|---------|
| **Node.js 18+** | Runs the launcher | [nodejs.org](https://nodejs.org) |
| **Google Cloud SDK** | Deploys to Cloud Run | [cloud.google.com/sdk](https://cloud.google.com/sdk/docs/install) |
| **Docker** | Builds container images | [docker.com](https://www.docker.com/products/docker-desktop) |

Then set up GCP:

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com
```

## Configuration

The launcher saves your settings to a `.env` file in the current directory so you don't have to re-enter them.

You can also pass everything via flags:

```bash
npx mcp-launcher --project my-project-id --api-key sk-ant-... --port 8080
```

| Flag | Description |
|------|-------------|
| `--project <id>` | Google Cloud Project ID |
| `--api-key <key>` | Anthropic API Key |
| `--port <number>` | Server port (default: 3000) |
| `--no-browser` | Don't auto-open the browser |
| `--save-config` | Save settings to `.env` |

## How deployment works

When you click Deploy in the dashboard:

1. Builds a Docker image from your MCP server code
2. Pushes it to Google Artifact Registry
3. Deploys to Cloud Run with auto-scaling
4. Verifies the service is live and gives you the URL

The deployed server is a standard Cloud Run service — you can manage it from the GCP Console like any other service.

## Health checks

The dashboard polls your deployed services to check if they're still running. If a service goes down (e.g., deleted from GCP Console), the status flips to **Unhealthy** with a diagnostic panel showing what went wrong.

You can configure the polling interval per server in the Observability Settings card on the server details page.

## Included template

The `template/` directory has a working Python MCP server (using FastMCP) you can deploy immediately to test things out. It includes example tools, resources, and prompts.

## Troubleshooting

**Port already in use** — another process is on port 3000. Use `--port 8080` or kill the existing process.

**Docker not running** — start Docker Desktop, or on Linux: `sudo systemctl start docker`

**gcloud not authenticated** — run `gcloud auth login` and `gcloud auth configure-docker`

**Permission denied on GCP** — your account needs Cloud Run Admin, Artifact Registry Admin, and Service Account User roles.

## License

ISC
