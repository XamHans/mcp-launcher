# === DYNAMIC CONFIGURATION ===
PROJECT_ID ?= workspace-463919
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
	@echo "🔧 Enabling GCP Services..."
	gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com --project=$(PROJECT_ID)
	@echo "📦 Creating Artifact Registry..."
	gcloud artifacts repositories create $(REPO_NAME) --repository-format=docker --location=$(REGION) --project=$(PROJECT_ID) || echo "Repo exists, skipping."
	@echo "🔐 Authenticating Docker..."
	gcloud auth configure-docker $(REGION)-docker.pkg.dev

# 2. DEPLOY: Build -> Push -> Run (One Command)
deploy:
	@echo "🏗️  Building Container..."
	docker build --platform $(PLATFORM) -t $(FULL_IMAGE) .
	@echo "🚀 Pushing to Registry..."
	docker push $(FULL_IMAGE)
	@echo "☁️  Deploying to Cloud Run..."
	gcloud run deploy $(SERVICE_NAME) \
		--image $(FULL_IMAGE) \
		--region $(REGION) \
		--project $(PROJECT_ID) \
		--allow-unauthenticated \
		--port 8080 \
		--memory 1Gi \
		--quiet

# 3. UTILS
logs:
	gcloud logs tail --project=$(PROJECT_ID) --filter="resource.type=cloud_run_revision AND resource.labels.service_name=$(SERVICE_NAME)"
