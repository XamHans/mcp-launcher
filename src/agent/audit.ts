import { query } from "@anthropic-ai/claude-agent-sdk";
import path from 'path';

interface AuditOptions {
    projectPath: string;
    apiKey: string;
    projectId: string;
    onLog: (message: string, type?: 'info' | 'warn' | 'error' | 'success') => void;
}

export async function runAuditAndGeneration({ projectPath, apiKey, projectId, onLog }: AuditOptions): Promise<{ success: boolean; error?: string }> {

    // 1. Initialize Environment
    process.env.ANTHROPIC_API_KEY = apiKey;
    onLog("🚀 Initializing Autonomous Cloud Architect...", "info");

    const originalCwd = process.cwd();

    try {
        // 2. Safe Directory Switching
        try {
            process.chdir(projectPath);
            onLog(`📂 Context switched to: ${projectPath}`, "info");
        } catch (err) {
            return { success: false, error: `Invalid Project Path: ${err}` };
        }

        // 3. Define Golden Templates (The "Truth")
        // We inject these into the prompt so the Agent has a strict baseline to adapt.
        const GOLDEN_DOCKERFILE = `
# Use the official Python lightweight image
FROM python:3.13-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Install the project into /app
COPY . /app
WORKDIR /app

# Allow statements and log messages to immediately appear in the logs
ENV PYTHONUNBUFFERED=1

# Install dependencies
# Agent: Use 'uv sync' if pyproject.toml exists, otherwise 'uv pip install -r requirements.txt --system'
RUN uv sync

EXPOSE $PORT

# Run the MCP server
# Agent: Update the filename to match the detected entry point
CMD ["uv", "run", "detected_server.py"]
`;

        const GOLDEN_MAKEFILE = `
# === DYNAMIC CONFIGURATION ===
PROJECT_ID ?= ${projectId}
REGION ?= us-central1
REPO_NAME ?= mcp-repo
SERVICE_NAME ?= mcp-server
IMAGE_TAG ?= latest
PLATFORM ?= linux/amd64

# Computed Variables
ARTIFACT_REGISTRY = $(REGION)-docker.pkg.dev
FULL_IMAGE = $(ARTIFACT_REGISTRY)/$(PROJECT_ID)/$(REPO_NAME)/$(SERVICE_NAME):$(IMAGE_TAG)

.PHONY: all gcp-setup deploy logs

# 1. SETUP: Enables APIs & Creates Repo (Idempotent)
gcp-setup:
\t@echo "🔧 Enabling GCP Services..."
\tgcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com --project=$(PROJECT_ID)
\t@echo "📦 Creating Artifact Registry..."
\tgcloud artifacts repositories create $(REPO_NAME) --repository-format=docker --location=$(REGION) --project=$(PROJECT_ID) || echo "Repo exists, skipping."
\t@echo "🔐 Authenticating Docker..."
\tgcloud auth configure-docker $(REGION)-docker.pkg.dev

# 2. DEPLOY: Build -> Push -> Run (One Command)
deploy:
\t@echo "🏗️  Building Container..."
\tdocker build --platform $(PLATFORM) -t $(FULL_IMAGE) .
\t@echo "🚀 Pushing to Registry..."
\tdocker push $(FULL_IMAGE)
\t@echo "☁️  Deploying to Cloud Run..."
\tgcloud run deploy $(SERVICE_NAME) \\
\t\t--image $(FULL_IMAGE) \\
\t\t--region $(REGION) \\
\t\t--project $(PROJECT_ID) \\
\t\t--allow-unauthenticated \\
\t\t--port 8080 \\
\t\t--memory 1Gi \\
\t\t--quiet

# 3. UTILS
logs:
\tgcloud logs tail --project=$(PROJECT_ID) --filter="resource.type=cloud_run_revision AND resource.labels.service_name=$(SERVICE_NAME)"
`;

        // 4. Construct the Master Prompt
        const systemPrompt = `
You are a Senior Google Cloud DevOps Engineer specializing in MCP (Model Context Protocol).

YOUR MISSION:
Audit the current directory and generate a robust deployment infrastructure for Google Cloud Run.

PHASE 1: AUDIT & AUTO-REMEDIATION (CRITICAL)
1.  **Entry Point Detection:** Scan for the main Python server file (e.g., looks for \`FastMCP\`, \`mcp.run\`, or \`if __name__ == "__main__"\`).
2.  **Host Binding Check:** Cloud Run REQUIRES the server to listen on \`0.0.0.0\`.
    -   Grep the entry file for \`host="localhost"\` or \`host="127.0.0.1"\`.
    -   IF FOUND: You MUST use the 'Edit' tool to change it to \`0.0.0.0\`. Do not ask. Just fix it.
3.  **Transport Detection:** Identify if the server uses \`sse\` (Server-Sent Events) or \`streamable-http\` (HTTP). Log this specifically.

PHASE 2: FILE GENERATION
Generate the following three files. Do not overwrite existing files if they are already perfect, but usually, you should overwrite to ensure correctness.

1.  **\`.dockerignore\`**:
    -   Create this file immediately.
    -   MUST include: \`.venv\`, \`__pycache__\`, \`.git\`, \`.env\`, \`dist\`, \`build\`.
    -   Reason: Uploading local venvs causes massive build failures.

2.  **\`Dockerfile\`**:
    -   Based on the Reference below, but ADAPT it.
    -   **Dependency Check:** Look for \`pyproject.toml\`.
        -   YES: Use \`RUN uv sync --no-dev\`.
        -   NO (only requirements.txt): Use \`RUN uv pip install -r requirements.txt --system\`.
    -   **Entry Point:** Update the \`CMD\` to point to the file you detected in Phase 1.

3.  **\`Makefile\`**:
    -   Use the Reference below exactly.
    -   Ensure the variables match the Project ID provided: ${projectId}.

REFERENCE DOCKERFILE:
\`\`\`dockerfile
${GOLDEN_DOCKERFILE}
\`\`\`

REFERENCE MAKEFILE:
\`\`\`makefile
${GOLDEN_MAKEFILE}
\`\`\`

EXECUTION PLAN:
1. Scan files to find entry point and dependencies.
2. Fix \`localhost\` binding if present.
3. Write \`.dockerignore\`.
4. Write \`Dockerfile\`.
5. Write \`Makefile\`.
6. Report final status.
`;

        onLog("🧠 Agent is analyzing project structure...", "info");

        // 5. Execute Agent
        const stream = query({
            prompt: "Audit this folder, fix networking issues, and generate GCP deployment files.",
            options: {
                allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
                systemPrompt: systemPrompt
            }
        });

        for await (const message of stream) {
            const msg = message as any;

            // Log Tool Usage (Transparent Logic)
            if (msg.type === 'tool_use') {
                if (msg.name === 'Edit') {
                    onLog(`🛠️  Fixing Code: Editing ${msg.input?.path || 'file'}...`, "warn");
                } else if (msg.name === 'Write') {
                    onLog(`📝 Generating: ${msg.input?.path}`, "success");
                } else {
                    onLog(`🔍 Agent Tool: ${msg.name}`, "info");
                }
            }

            // Log Thoughts/Text
            if (msg.type === 'text' && msg.text) {
                // Filter out verbose thinking, show key decisions
                if (msg.text.includes("Phase") || msg.text.includes("Detected")) {
                    onLog(msg.text, "info");
                }
            }
        }

        // 6. Cleanup
        process.chdir(originalCwd);
        onLog("✅ Infrastructure Generation Complete.", "success");
        return { success: true };

    } catch (error) {
        process.chdir(originalCwd);
        onLog(`❌ Agent Error: ${error}`, "error");
        return { success: false, error: String(error) };
    }
}