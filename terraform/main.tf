# Terraform configuration for Rapid Tech Store infrastructure

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 4.0"
    }
  }
  
  backend "gcs" {
    bucket = "rapid-tech-store-terraform-state"
    prefix = "terraform/state"
  }
}

# Configure the Google Cloud Provider
provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

# Variables
variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "The GCP zone"
  type        = string
  default     = "us-central1-a"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

# Enable required APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "compute.googleapis.com",
    "container.googleapis.com",
    "cloudbuild.googleapis.com",
    "cloudrun.googleapis.com",
    "sqladmin.googleapis.com",
    "secretmanager.googleapis.com",
    "storage.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
    "cloudtrace.googleapis.com",
    "clouddebugger.googleapis.com",
    "cloudprofiler.googleapis.com",
    "redis.googleapis.com",
    "pubsub.googleapis.com",
    "cloudscheduler.googleapis.com",
    "cloudtasks.googleapis.com",
    "artifactregistry.googleapis.com"
  ])
  
  project = var.project_id
  service = each.value
  
  disable_dependent_services = true
}

# VPC Network
resource "google_compute_network" "vpc" {
  name                    = "rapid-tech-store-vpc"
  auto_create_subnetworks = false
  mtu                     = 1460
  
  depends_on = [google_project_service.apis]
}

# Subnet
resource "google_compute_subnetwork" "subnet" {
  name          = "rapid-tech-store-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
  
  secondary_ip_range {
    range_name    = "services-range"
    ip_cidr_range = "192.168.1.0/24"
  }
  
  secondary_ip_range {
    range_name    = "pod-ranges"
    ip_cidr_range = "192.168.64.0/22"
  }
}

# Cloud SQL Instance
resource "google_sql_database_instance" "postgres" {
  name             = "rapid-tech-store-db"
  database_version = "POSTGRES_14"
  region           = var.region
  
  settings {
    tier                        = "db-custom-2-4096"
    availability_type           = "REGIONAL"
    disk_type                   = "PD_SSD"
    disk_size                   = 100
    disk_autoresize             = true
    disk_autoresize_limit       = 500
    
    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      location                       = var.region
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 30
        retention_unit   = "COUNT"
      }
    }
    
    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
      require_ssl     = true
    }
    
    database_flags {
      name  = "log_checkpoints"
      value = "on"
    }
    
    database_flags {
      name  = "log_connections"
      value = "on"
    }
    
    database_flags {
      name  = "log_disconnections"
      value = "on"
    }
    
    database_flags {
      name  = "log_lock_waits"
      value = "on"
    }
    
    database_flags {
      name  = "log_temp_files"
      value = "0"
    }
    
    database_flags {
      name  = "log_min_duration_statement"
      value = "1000"
    }
    
    maintenance_window {
      day          = 7
      hour         = 3
      update_track = "stable"
    }
    
    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = true
    }
  }
  
  deletion_protection = true
  
  depends_on = [google_project_service.apis]
}

# Database
resource "google_sql_database" "database" {
  name     = "rapidtechstore"
  instance = google_sql_database_instance.postgres.name
}

# Database User
resource "google_sql_user" "user" {
  name     = "rapidtechstore"
  instance = google_sql_database_instance.postgres.name
  password = random_password.db_password.result
}

resource "random_password" "db_password" {
  length  = 32
  special = true
}

# GKE Cluster
resource "google_container_cluster" "primary" {
  name     = "rapid-tech-store-gke"
  location = var.region
  
  # We can't create a cluster with no node pool defined, but we want to only use
  # separately managed node pools. So we create the smallest possible default
  # node pool and immediately delete it.
  remove_default_node_pool = true
  initial_node_count       = 1
  
  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.subnet.name
  
  # Enable Workload Identity
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }
  
  # Enable network policy
  network_policy {
    enabled = true
  }
  
  # Enable IP alias
  ip_allocation_policy {
    cluster_secondary_range_name  = "pod-ranges"
    services_secondary_range_name = "services-range"
  }
  
  # Enable private cluster
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }
  
  # Master authorized networks
  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = "0.0.0.0/0"
      display_name = "All"
    }
  }
  
  # Enable logging and monitoring
  logging_service    = "logging.googleapis.com/kubernetes"
  monitoring_service = "monitoring.googleapis.com/kubernetes"
  
  # Enable addons
  addons_config {
    http_load_balancing {
      disabled = false
    }
    
    horizontal_pod_autoscaling {
      disabled = false
    }
    
    network_policy_config {
      disabled = false
    }
    
    gcp_filestore_csi_driver_config {
      enabled = true
    }
    
    gce_persistent_disk_csi_driver_config {
      enabled = true
    }
  }
  
  # Enable binary authorization
  binary_authorization {
    evaluation_mode = "PROJECT_SINGLETON_POLICY_ENFORCE"
  }
  
  # Enable shielded nodes
  enable_shielded_nodes = true
  
  depends_on = [
    google_project_service.apis,
    google_compute_subnetwork.subnet
  ]
}

# GKE Node Pool
resource "google_container_node_pool" "primary_nodes" {
  name       = "rapid-tech-store-node-pool"
  location   = var.region
  cluster    = google_container_cluster.primary.name
  node_count = 1
  
  autoscaling {
    min_node_count = 1
    max_node_count = 10
  }
  
  management {
    auto_repair  = true
    auto_upgrade = true
  }
  
  node_config {
    preemptible  = false
    machine_type = "e2-standard-4"
    disk_size_gb = 100
    disk_type    = "pd-ssd"
    
    # Google recommends custom service accounts that have cloud-platform scope and permissions granted via IAM Roles.
    service_account = google_service_account.gke_service_account.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
    
    labels = {
      environment = var.environment
      application = "rapid-tech-store"
    }
    
    tags = ["rapid-tech-store-node"]
    
    # Enable shielded VM features
    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }
    
    # Enable Workload Identity
    workload_metadata_config {
      mode = "GKE_METADATA"
    }
  }
  
  upgrade_settings {
    max_surge       = 1
    max_unavailable = 0
  }
  
  depends_on = [google_container_cluster.primary]
}

# Service Account for GKE nodes
resource "google_service_account" "gke_service_account" {
  account_id   = "rapid-tech-store-gke-sa"
  display_name = "Rapid Tech Store GKE Service Account"
}

# IAM bindings for GKE service account
resource "google_project_iam_member" "gke_service_account_roles" {
  for_each = toset([
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/monitoring.viewer",
    "roles/stackdriver.resourceMetadata.writer",
    "roles/storage.objectViewer",
    "roles/artifactregistry.reader"
  ])
  
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.gke_service_account.email}"
}

# Cloud Storage bucket for assets
resource "google_storage_bucket" "assets" {
  name          = "${var.project_id}-rapid-tech-store-assets"
  location      = var.region
  force_destroy = false
  
  uniform_bucket_level_access = true
  
  versioning {
    enabled = true
  }
  
  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }
  
  cors {
    origin          = ["https://rapidtechstore.com", "https://www.rapidtechstore.com"]
    method          = ["GET", "HEAD", "PUT", "POST", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
  
  depends_on = [google_project_service.apis]
}

# Cloud Storage bucket for Terraform state
resource "google_storage_bucket" "terraform_state" {
  name          = "${var.project_id}-rapid-tech-store-terraform-state"
  location      = var.region
  force_destroy = false
  
  uniform_bucket_level_access = true
  
  versioning {
    enabled = true
  }
  
  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }
  
  depends_on = [google_project_service.apis]
}

# Redis instance for caching
resource "google_redis_instance" "cache" {
  name           = "rapid-tech-store-cache"
  tier           = "STANDARD_HA"
  memory_size_gb = 1
  region         = var.region
  
  location_id             = var.zone
  alternative_location_id = "${substr(var.region, 0, length(var.region)-1)}b"
  
  authorized_network = google_compute_network.vpc.id
  
  redis_version     = "REDIS_6_X"
  display_name      = "Rapid Tech Store Cache"
  reserved_ip_range = "192.168.0.0/29"
  
  depends_on = [google_project_service.apis]
}

# Pub/Sub topic for notifications
resource "google_pubsub_topic" "notifications" {
  name = "rapid-tech-store-notifications"
  
  depends_on = [google_project_service.apis]
}

# Pub/Sub subscription
resource "google_pubsub_subscription" "notifications_subscription" {
  name  = "rapid-tech-store-notifications-sub"
  topic = google_pubsub_topic.notifications.name
  
  ack_deadline_seconds = 20
  
  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }
  
  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.dead_letter.id
    max_delivery_attempts = 5
  }
}

# Dead letter topic
resource "google_pubsub_topic" "dead_letter" {
  name = "rapid-tech-store-dead-letter"
}

# Cloud Scheduler job for automatic payouts
resource "google_cloud_scheduler_job" "automatic_payouts" {
  name             = "automatic-payouts"
  description      = "Process automatic payouts daily"
  schedule         = "0 2 * * *"
  time_zone        = "UTC"
  attempt_deadline = "320s"
  
  retry_config {
    retry_count = 3
  }
  
  http_target {
    http_method = "POST"
    uri         = "https://rapid-tech-store-backend-${var.project_id}.a.run.app/api/v1/payouts/system/process-automatic"
    
    headers = {
      "Content-Type" = "application/json"
    }
    
    body = base64encode(jsonencode({
      source = "cloud-scheduler"
    }))
  }
  
  depends_on = [google_project_service.apis]
}

# Cloud Scheduler job for analytics aggregation
resource "google_cloud_scheduler_job" "analytics_aggregation" {
  name             = "analytics-aggregation"
  description      = "Aggregate analytics data hourly"
  schedule         = "0 * * * *"
  time_zone        = "UTC"
  attempt_deadline = "320s"
  
  retry_config {
    retry_count = 3
  }
  
  http_target {
    http_method = "POST"
    uri         = "https://rapid-tech-store-backend-${var.project_id}.a.run.app/api/v1/analytics/system/aggregate"
    
    headers = {
      "Content-Type" = "application/json"
    }
    
    body = base64encode(jsonencode({
      source = "cloud-scheduler"
    }))
  }
  
  depends_on = [google_project_service.apis]
}

# Static IP for ingress
resource "google_compute_global_address" "ingress_ip" {
  name = "rapid-tech-store-ip"
  
  depends_on = [google_project_service.apis]
}

# Outputs
output "cluster_name" {
  description = "GKE cluster name"
  value       = google_container_cluster.primary.name
}

output "cluster_location" {
  description = "GKE cluster location"
  value       = google_container_cluster.primary.location
}

output "database_connection_name" {
  description = "Database connection name"
  value       = google_sql_database_instance.postgres.connection_name
}

output "database_private_ip" {
  description = "Database private IP"
  value       = google_sql_database_instance.postgres.private_ip_address
}

output "redis_host" {
  description = "Redis host"
  value       = google_redis_instance.cache.host
}

output "redis_port" {
  description = "Redis port"
  value       = google_redis_instance.cache.port
}

output "storage_bucket_name" {
  description = "Storage bucket name"
  value       = google_storage_bucket.assets.name
}

output "static_ip" {
  description = "Static IP address"
  value       = google_compute_global_address.ingress_ip.address
}

output "pubsub_topic" {
  description = "Pub/Sub topic name"
  value       = google_pubsub_topic.notifications.name
}