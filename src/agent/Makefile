# Dynamic Makefile for Python Projects with UV
# Configurable for multiple projects - just update the variables below

# ==================== PROJECT CONFIGURATION ====================
# Override any of these with environment variables or by editing this section
PROJECT_NAME ?= $(notdir $(CURDIR))
SERVICE_NAME ?= $(PROJECT_NAME)
DOCKER_IMAGE_NAME ?= $(PROJECT_NAME)
PYTHON_ENTRY_POINT ?= my_server.py

# Google Cloud Configuration (matches .env variable names)
PROJECT_ID ?= your-gcp-project-id
REGION ?= us-central1
MEMORY ?= 1Gi
PORT ?= 8080
GCP_REPO_NAME ?= technova-repo

# Additional GCP settings (computed from .env variables)
GCP_PROJECT_ID ?= $(PROJECT_ID)
GCP_REGION ?= $(REGION)
GCP_MEMORY ?= $(MEMORY)
GCP_PORT ?= $(PORT)
GCP_ARTIFACT_REGISTRY ?= $(REGION)-docker.pkg.dev
GCP_REPO_NAME ?= $(GCP_REPO_NAME)

# Docker Configuration
DOCKER_PLATFORM ?= linux/amd64
LOCAL_PORT ?= $(PORT)

# Python/UV Configuration
PYTHON_VERSION ?= 3.11

# ==================== COMPUTED VARIABLES ====================
# These are automatically computed from the above configurations
DOCKER_TAG ?= latest
FULL_IMAGE_NAME = $(GCP_ARTIFACT_REGISTRY)/$(GCP_PROJECT_ID)/$(GCP_REPO_NAME)/$(DOCKER_IMAGE_NAME):$(DOCKER_TAG)

# Colors for output
BLUE := \033[36m
RESET := \033[0m
GREEN := \033[32m
YELLOW := \033[33m

# ==================== HELP & DEFAULT ====================
.PHONY: help
help: ## Show this help message
	@echo "$(BLUE)$(PROJECT_NAME) - Dynamic Python Project Makefile$(RESET)"
	@echo ""
	@echo "$(YELLOW)Current Configuration:$(RESET)"
	@echo "  Project Name: $(PROJECT_NAME)"
	@echo "  Project ID: $(PROJECT_ID)"
	@echo "  Region: $(REGION)"
	@echo "  Service Name: $(SERVICE_NAME)"
	@echo "  Port: $(PORT)"
	@echo "  Memory: $(MEMORY)"
	@echo ""
	@echo "$(YELLOW)Available commands:$(RESET)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(BLUE)%-20s$(RESET) %s\n", $1, $2}' $(MAKEFILE_LIST)
	@echo ""
	@echo "$(YELLOW)Configuration Options:$(RESET)"
	@echo "  You can override any variable, e.g.:"
	@echo "  make deploy PROJECT_ID=my-project"
	@echo "  make docker-build PROJECT_NAME=my-app"

# ==================== DEVELOPMENT SETUP ====================
.PHONY: install dev
install: ## Install production dependencies only
	uv sync --no-dev

dev: ## Install all dependencies including dev tools
	uv sync

# ==================== CODE QUALITY ====================
.PHONY: lint format format-check
lint: ## Run linting with Ruff
	uv run ruff check *.py

format: ## Format code with Ruff
	uv run ruff format *.py

format-check: ## Check if code is properly formatted
	uv run ruff format --check *.py

# ==================== TESTING ====================
.PHONY: test test-cov
test: ## Run tests with pytest (if tests exist)
	@if [ -d "tests" ]; then uv run pytest tests/ -v; else echo "No tests directory found"; fi

test-cov: ## Run tests with coverage (if tests exist)
	@if [ -d "tests" ]; then uv run pytest tests/ -v --cov=. --cov-report=html --cov-report=term; else echo "No tests directory found"; fi

# ==================== LOCAL DEVELOPMENT ====================
.PHONY: run run-dev
run: ## Run the server locally
	PORT=$(GCP_PORT) uv run python $(PYTHON_ENTRY_POINT)

run-dev: ## Run server with auto-reload (development mode)
	PORT=$(GCP_PORT) uv run python $(PYTHON_ENTRY_POINT)

# ==================== DOCKER OPERATIONS ====================
.PHONY: docker-build docker-run docker-run-it docker-push
docker-build: ## Build Docker image
	@echo "$(GREEN)Building Docker image: $(DOCKER_IMAGE_NAME)$(RESET)"
	docker build --platform $(DOCKER_PLATFORM) -t $(DOCKER_IMAGE_NAME) .

docker-run: ## Run Docker container locally
	@echo "$(GREEN)Running container: $(DOCKER_IMAGE_NAME)$(RESET)"
	docker run -p $(LOCAL_PORT):$(GCP_PORT) -e PORT=$(GCP_PORT) $(DOCKER_IMAGE_NAME)

docker-run-it: ## Run Docker container interactively
	docker run -it -p $(LOCAL_PORT):$(GCP_PORT) -e PORT=$(GCP_PORT) $(DOCKER_IMAGE_NAME) /bin/bash

docker-push: docker-build ## Push Docker image to registry
	@echo "$(GREEN)Pushing image to: $(FULL_IMAGE_NAME)$(RESET)"
	docker tag $(DOCKER_IMAGE_NAME) $(FULL_IMAGE_NAME)
	docker push $(FULL_IMAGE_NAME)

# ==================== GOOGLE CLOUD SETUP ====================
.PHONY: gcp-init gcp-auth gcp-enable-apis gcp-create-repo gcp-setup
gcp-init: ## Initialize GCP project (run this first for new projects)
	@echo "$(YELLOW)Initializing Google Cloud project: $(GCP_PROJECT_ID)$(RESET)"
	gcloud config set project $(GCP_PROJECT_ID)

gcp-auth: ## Authenticate with Google Cloud
	gcloud auth login
	gcloud auth configure-docker $(GCP_ARTIFACT_REGISTRY)

gcp-enable-apis: ## Enable required Google Cloud APIs
	@echo "$(GREEN)Enabling required APIs...$(RESET)"
	gcloud services enable run.googleapis.com \
		cloudbuild.googleapis.com \
		artifactregistry.googleapis.com \
		--project=$(GCP_PROJECT_ID)

gcp-create-repo: ## Create Artifact Registry repository
	@echo "$(GREEN)Creating Artifact Registry repository...$(RESET)"
	gcloud artifacts repositories create $(GCP_REPO_NAME) \
		--repository-format=docker \
		--location=$(GCP_REGION) \
		--project=$(GCP_PROJECT_ID) || echo "Repository may already exist"

gcp-setup: gcp-init gcp-enable-apis gcp-create-repo ## Complete GCP setup for new projects
	@echo "$(GREEN)✅ Google Cloud setup complete!$(RESET)"

# ==================== DEPLOYMENT ====================
.PHONY: deploy deploy-source deploy-image
deploy: deploy-source ## Deploy to Google Cloud Run from source (recommended)

deploy-source: ## Deploy from source using Cloud Build
	@echo "$(GREEN)Deploying $(SERVICE_NAME) from source...$(RESET)"
	gcloud run deploy $(SERVICE_NAME) \
		--source . \
		--port $(GCP_PORT) \
		--memory $(GCP_MEMORY) \
		--allow-unauthenticated \
		--region $(GCP_REGION) \
		--project $(GCP_PROJECT_ID)

deploy-image: docker-push ## Build and deploy Docker image to Cloud Run
	@echo "$(GREEN)Deploying $(SERVICE_NAME) from image...$(RESET)"
	gcloud run deploy $(SERVICE_NAME) \
		--image $(FULL_IMAGE_NAME) \
		--port $(GCP_PORT) \
		--memory $(GCP_MEMORY) \
		--allow-unauthenticated \
		--region $(GCP_REGION) \
		--project $(GCP_PROJECT_ID) \
		--platform managed

# ==================== PROJECT INFO & HEALTH ====================
.PHONY: info health logs url
info: ## Show project configuration and status
	@echo "$(BLUE)=== Project Configuration ===$(RESET)"
	@echo "Project Name: $(PROJECT_NAME)"
	@echo "Service Name: $(SERVICE_NAME)"
	@echo "Docker Image: $(DOCKER_IMAGE_NAME)"
	@echo "Python Entry Point: $(PYTHON_ENTRY_POINT)"
	@echo ""
	@echo "$(BLUE)=== Google Cloud Configuration ===$(RESET)"
	@echo "Project ID: $(PROJECT_ID)"
	@echo "Region: $(REGION)"
	@echo "Service Port: $(PORT)"
	@echo "Memory: $(MEMORY)"
	@echo "Full Image Path: $(FULL_IMAGE_NAME)"
	@echo ""
	@echo "$(BLUE)=== Environment ===$(RESET)"
	@echo "Python version: $(uv python --version 2>/dev/null || echo 'Not found')"
	@echo "UV version: $(uv --version 2>/dev/null || echo 'Not found')"
	@echo "Virtual environment: $(ls .venv 2>/dev/null && echo '.venv exists' || echo 'Not created')"

health: ## Check if server is running locally
	@echo "Checking local server health on port $(LOCAL_PORT)..."
	@curl -f http://localhost:$(LOCAL_PORT)/ 2>/dev/null && echo "$(GREEN)✅ Server is responding$(RESET)" || echo "❌ Server is not responding"

logs: ## View Cloud Run logs
	gcloud logs tail --project=$(GCP_PROJECT_ID) --filter="resource.type=cloud_run_revision AND resource.labels.service_name=$(SERVICE_NAME)"

url: ## Get deployed service URL
	@echo "$(GREEN)Service URL:$(RESET)"
	@gcloud run services describe $(SERVICE_NAME) \
		--region=$(GCP_REGION) \
		--project=$(GCP_PROJECT_ID) \
		--format="value(status.url)" 2>/dev/null || echo "Service not deployed yet"

# ==================== CLEANUP ====================
.PHONY: clean clean-docker clean-all
clean: ## Clean build artifacts and cache
	rm -rf build/ dist/ *.egg-info/ .pytest_cache/ htmlcov/ .coverage
	find . -type d -name __pycache__ -delete
	find . -type f -name "*.pyc" -delete

clean-docker: ## Remove local Docker images
	docker rmi $(DOCKER_IMAGE_NAME) 2>/dev/null || true
	docker rmi $(FULL_IMAGE_NAME) 2>/dev/null || true

clean-all: clean clean-docker ## Clean everything

# ==================== UV MANAGEMENT ====================
.PHONY: uv-install uv-update lock sync
uv-install: ## Install UV (if not already installed)
	@command -v uv >/dev/null 2>&1 || curl -LsSf https://astral.sh/uv/install.sh | sh

uv-update: ## Update UV to latest version
	uv self update

lock: ## Generate/update the lock file
	uv lock

sync: ## Sync environment with lock file
	uv sync

# ==================== CI/CD ====================
.PHONY: ci-test ci-deploy
ci-test: lint format-check test ## Run all CI checks locally

ci-deploy: ci-test deploy ## Run tests then deploy

# ==================== QUICK START ====================
.PHONY: quickstart new-project
quickstart: ## Quick setup for existing project
	@echo "$(YELLOW)Quick Start Guide:$(RESET)"
	@echo "1. Update variables at top of Makefile"
	@echo "2. Run: make gcp-setup"
	@echo "3. Run: make dev"
	@echo "4. Run: make deploy"

new-project: ## Initialize a new project from scratch
	@echo "$(GREEN)Setting up new project: $(PROJECT_NAME)$(RESET)"
	@echo "Creating project structure..."
	@mkdir -p tests
	@touch README.md
	@echo "# $(PROJECT_NAME)" > README.md
	@echo "$(GREEN)✅ Project structure created!$(RESET)"
	@echo ""
	@echo "Next steps:"
	@echo "1. Edit Makefile variables or create .env file"
	@echo "2. Run: make gcp-setup PROJECT_ID=your-project-id"
	@echo "3. Create your Python files"
	@echo "4. Run: make dev"
	@echo "5. Run: make deploy"

# Include .env file if it exists for local overrides
-include .env
export