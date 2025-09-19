#!/bin/bash

# Rapid Tech Store Deployment Script
# This script automates the deployment process to Google Cloud

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID=${PROJECT_ID:-""}
REGION=${REGION:-"us-central1"}
ZONE=${ZONE:-"us-central1-a"}
CLUSTER_NAME="rapid-tech-store-gke"
SERVICE_NAME="rapid-tech-store-backend"
ENVIRONMENT=${ENVIRONMENT:-"production"}

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed. Please install it first."
        exit 1
    fi
    
    # Check if terraform is installed
    if ! command -v terraform &> /dev/null; then
        log_error "terraform is not installed. Please install it first."
        exit 1
    fi
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "docker is not installed. Please install it first."
        exit 1
    fi
    
    # Check if PROJECT_ID is set
    if [ -z "$PROJECT_ID" ]; then
        log_error "PROJECT_ID environment variable is not set."
        exit 1
    fi
    
    log_success "All prerequisites are met."
}

setup_gcloud() {
    log_info "Setting up gcloud configuration..."
    
    # Set project
    gcloud config set project $PROJECT_ID
    
    # Set region and zone
    gcloud config set compute/region $REGION
    gcloud config set compute/zone $ZONE
    
    # Enable required APIs
    log_info "Enabling required Google Cloud APIs..."
    gcloud services enable \
        compute.googleapis.com \
        container.googleapis.com \
        cloudbuild.googleapis.com \
        cloudrun.googleapis.com \
        sqladmin.googleapis.com \
        secretmanager.googleapis.com \
        storage.googleapis.com \
        monitoring.googleapis.com \
        logging.googleapis.com \
        artifactregistry.googleapis.com
    
    log_success "gcloud configuration completed."
}

deploy_infrastructure() {
    log_info "Deploying infrastructure with Terraform..."
    
    cd terraform
    
    # Initialize Terraform
    terraform init
    
    # Plan deployment
    terraform plan -var="project_id=$PROJECT_ID" -var="region=$REGION" -var="zone=$ZONE"
    
    # Apply deployment
    terraform apply -var="project_id=$PROJECT_ID" -var="region=$REGION" -var="zone=$ZONE" -auto-approve
    
    cd ..
    
    log_success "Infrastructure deployment completed."
}

setup_secrets() {
    log_info "Setting up secrets..."
    
    # Check if secrets need to be created manually
    log_warning "Please ensure the following secrets are set in Google Secret Manager:"
    echo "  - openai-api-key"
    echo "  - google-client-id"
    echo "  - google-client-secret"
    echo "  - razorpay-key-id"
    echo "  - razorpay-key-secret"
    echo "  - razorpay-webhook-secret"
    echo "  - payoneer-api-key"
    echo "  - payoneer-api-secret"
    echo "  - payoneer-webhook-secret"
    echo "  - sendgrid-api-key"
    echo "  - google-play-service-account"
    echo "  - sentry-dsn"
    
    read -p "Have you set all the required secrets? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_error "Please set all required secrets before continuing."
        exit 1
    fi
    
    log_success "Secrets verification completed."
}

build_and_push_image() {
    log_info "Building and pushing Docker image..."
    
    # Build image
    docker build -t gcr.io/$PROJECT_ID/$SERVICE_NAME:latest .
    
    # Push to Container Registry
    docker push gcr.io/$PROJECT_ID/$SERVICE_NAME:latest
    
    log_success "Docker image built and pushed successfully."
}

deploy_to_gke() {
    log_info "Deploying to Google Kubernetes Engine..."
    
    # Get cluster credentials
    gcloud container clusters get-credentials $CLUSTER_NAME --region $REGION
    
    # Update deployment image
    sed -i "s/PROJECT_ID/$PROJECT_ID/g" k8s/deployment.yaml
    sed -i "s/PROJECT_ID/$PROJECT_ID/g" k8s/ingress.yaml
    
    # Apply Kubernetes manifests
    kubectl apply -f k8s/namespace.yaml
    kubectl apply -f k8s/secrets.yaml
    kubectl apply -f k8s/deployment.yaml
    kubectl apply -f k8s/ingress.yaml
    
    # Wait for deployment to be ready
    kubectl rollout status deployment/rapid-tech-store-backend -n rapid-tech-store --timeout=300s
    
    log_success "GKE deployment completed."
}

deploy_to_cloud_run() {
    log_info "Deploying to Cloud Run..."
    
    gcloud run deploy $SERVICE_NAME \
        --image=gcr.io/$PROJECT_ID/$SERVICE_NAME:latest \
        --region=$REGION \
        --platform=managed \
        --allow-unauthenticated \
        --port=3000 \
        --memory=2Gi \
        --cpu=2 \
        --max-instances=100 \
        --min-instances=1 \
        --concurrency=80 \
        --timeout=300 \
        --set-env-vars=NODE_ENV=production \
        --set-secrets=DATABASE_URL=database-url:latest,JWT_SECRET=jwt-secret:latest,OPENAI_API_KEY=openai-api-key:latest,GOOGLE_CLIENT_ID=google-client-id:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest,RAZORPAY_KEY_ID=razorpay-key-id:latest,RAZORPAY_KEY_SECRET=razorpay-key-secret:latest,PAYONEER_API_KEY=payoneer-api-key:latest,SENDGRID_API_KEY=sendgrid-api-key:latest
    
    log_success "Cloud Run deployment completed."
}

run_database_migrations() {
    log_info "Running database migrations..."
    
    # Get the Cloud Run service URL
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")
    
    # Run migrations using Cloud Run job
    gcloud run jobs create migrate-db \
        --image=gcr.io/$PROJECT_ID/$SERVICE_NAME:latest \
        --region=$REGION \
        --set-secrets=DATABASE_URL=database-url:latest \
        --command="npx" \
        --args="prisma,migrate,deploy" \
        --max-retries=3 \
        --parallelism=1 \
        --task-count=1 \
        --task-timeout=300 \
        --memory=1Gi \
        --cpu=1 || true
    
    # Execute the migration job
    gcloud run jobs execute migrate-db --region=$REGION --wait
    
    log_success "Database migrations completed."
}

setup_monitoring() {
    log_info "Setting up monitoring and alerting..."
    
    # Create uptime check
    gcloud alpha monitoring uptime create \
        --display-name="Rapid Tech Store API Health Check" \
        --http-check-path="/health" \
        --http-check-port=443 \
        --http-check-use-ssl \
        --monitored-resource-type="uptime_url" \
        --monitored-resource-labels="host=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)' | sed 's|https://||')" \
        --period=60 \
        --timeout=10 || true
    
    log_success "Monitoring setup completed."
}

setup_cloud_build_trigger() {
    log_info "Setting up Cloud Build trigger..."
    
    # Create build trigger for main branch
    gcloud builds triggers create github \
        --repo-name="rapid-tech-store" \
        --repo-owner="your-github-username" \
        --branch-pattern="^main$" \
        --build-config="cloudbuild.yaml" \
        --description="Deploy Rapid Tech Store on push to main" || true
    
    log_success "Cloud Build trigger setup completed."
}

verify_deployment() {
    log_info "Verifying deployment..."
    
    # Get service URL
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")
    
    # Test health endpoint
    if curl -f "$SERVICE_URL/health" > /dev/null 2>&1; then
        log_success "Health check passed: $SERVICE_URL/health"
    else
        log_error "Health check failed: $SERVICE_URL/health"
        exit 1
    fi
    
    # Display service information
    echo
    log_info "Deployment Summary:"
    echo "  Service URL: $SERVICE_URL"
    echo "  Project ID: $PROJECT_ID"
    echo "  Region: $REGION"
    echo "  Environment: $ENVIRONMENT"
    echo
    
    log_success "Deployment verification completed successfully!"
}

cleanup_old_resources() {
    log_info "Cleaning up old resources..."
    
    # Clean up old Cloud Run revisions (keep last 5)
    gcloud run revisions list \
        --service=$SERVICE_NAME \
        --region=$REGION \
        --format="value(metadata.name)" \
        --sort-by="~metadata.creationTimestamp" \
        --limit=100 | tail -n +6 | while read revision; do
        if [ ! -z "$revision" ]; then
            gcloud run revisions delete "$revision" --region=$REGION --quiet || true
        fi
    done
    
    # Clean up old container images (keep last 10)
    gcloud container images list-tags gcr.io/$PROJECT_ID/$SERVICE_NAME \
        --format="value(digest)" \
        --sort-by="~timestamp" \
        --limit=100 | tail -n +11 | while read digest; do
        if [ ! -z "$digest" ]; then
            gcloud container images delete "gcr.io/$PROJECT_ID/$SERVICE_NAME@$digest" --quiet || true
        fi
    done
    
    log_success "Cleanup completed."
}

# Main deployment function
main() {
    log_info "Starting Rapid Tech Store deployment..."
    
    check_prerequisites
    setup_gcloud
    
    # Choose deployment target
    echo "Select deployment target:"
    echo "1) Cloud Run (Recommended for production)"
    echo "2) Google Kubernetes Engine"
    echo "3) Infrastructure only"
    read -p "Enter your choice (1-3): " choice
    
    case $choice in
        1)
            deploy_infrastructure
            setup_secrets
            build_and_push_image
            deploy_to_cloud_run
            run_database_migrations
            setup_monitoring
            setup_cloud_build_trigger
            verify_deployment
            cleanup_old_resources
            ;;
        2)
            deploy_infrastructure
            setup_secrets
            build_and_push_image
            deploy_to_gke
            run_database_migrations
            setup_monitoring
            setup_cloud_build_trigger
            verify_deployment
            cleanup_old_resources
            ;;
        3)
            deploy_infrastructure
            setup_secrets
            log_success "Infrastructure deployment completed."
            ;;
        *)
            log_error "Invalid choice. Please run the script again."
            exit 1
            ;;
    esac
    
    log_success "Rapid Tech Store deployment completed successfully!"
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Rapid Tech Store Deployment Script"
        echo
        echo "Usage: $0 [options]"
        echo
        echo "Options:"
        echo "  --help, -h          Show this help message"
        echo "  --infrastructure    Deploy infrastructure only"
        echo "  --cloud-run         Deploy to Cloud Run"
        echo "  --gke              Deploy to Google Kubernetes Engine"
        echo "  --cleanup          Cleanup old resources only"
        echo
        echo "Environment Variables:"
        echo "  PROJECT_ID         Google Cloud Project ID (required)"
        echo "  REGION            Google Cloud Region (default: us-central1)"
        echo "  ZONE              Google Cloud Zone (default: us-central1-a)"
        echo "  ENVIRONMENT       Environment name (default: production)"
        exit 0
        ;;
    --infrastructure)
        check_prerequisites
        setup_gcloud
        deploy_infrastructure
        setup_secrets
        ;;
    --cloud-run)
        check_prerequisites
        setup_gcloud
        build_and_push_image
        deploy_to_cloud_run
        run_database_migrations
        verify_deployment
        ;;
    --gke)
        check_prerequisites
        setup_gcloud
        build_and_push_image
        deploy_to_gke
        run_database_migrations
        verify_deployment
        ;;
    --cleanup)
        check_prerequisites
        setup_gcloud
        cleanup_old_resources
        ;;
    "")
        main
        ;;
    *)
        log_error "Unknown option: $1"
        echo "Use --help for usage information."
        exit 1
        ;;
esac