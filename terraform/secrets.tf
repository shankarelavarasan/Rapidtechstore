# Secret Manager secrets configuration

# Database URL secret
resource "google_secret_manager_secret" "database_url" {
  secret_id = "database-url"
  
  replication {
    automatic = true
  }
  
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "database_url" {
  secret = google_secret_manager_secret.database_url.id
  secret_data = "postgresql://${google_sql_user.user.name}:${google_sql_user.user.password}@${google_sql_database_instance.postgres.private_ip_address}:5432/${google_sql_database.database.name}?sslmode=require"
}

# JWT Secret
resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "jwt-secret"
  
  replication {
    automatic = true
  }
  
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "jwt_secret" {
  secret = google_secret_manager_secret.jwt_secret.id
  secret_data = random_password.jwt_secret.result
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

# OpenAI API Key secret
resource "google_secret_manager_secret" "openai_api_key" {
  secret_id = "openai-api-key"
  
  replication {
    automatic = true
  }
  
  depends_on = [google_project_service.apis]
}

# Google OAuth secrets
resource "google_secret_manager_secret" "google_client_id" {
  secret_id = "google-client-id"
  
  replication {
    automatic = true
  }
  
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret" "google_client_secret" {
  secret_id = "google-client-secret"
  
  replication {
    automatic = true
  }
  
  depends_on = [google_project_service.apis]
}

# Razorpay secrets
resource "google_secret_manager_secret" "razorpay_key_id" {
  secret_id = "razorpay-key-id"
  
  replication {
    automatic = true
  }
  
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret" "razorpay_key_secret" {
  secret_id = "razorpay-key-secret"
  
  replication {
    automatic = true
  }
  
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret" "razorpay_webhook_secret" {
  secret_id = "razorpay-webhook-secret"
  
  replication {
    automatic = true
  }
  
  depends_on = [google_project_service.apis]
}

# Payoneer secrets
resource "google_secret_manager_secret" "payoneer_api_key" {
  secret_id = "payoneer-api-key"
  
  replication {
    automatic = true
  }
  
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret" "payoneer_api_secret" {
  secret_id = "payoneer-api-secret"
  
  replication {
    automatic = true
  }
  
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret" "payoneer_webhook_secret" {
  secret_id = "payoneer-webhook-secret"
  
  replication {
    automatic = true
  }
  
  depends_on = [google_project_service.apis]
}

# SendGrid API Key
resource "google_secret_manager_secret" "sendgrid_api_key" {
  secret_id = "sendgrid-api-key"
  
  replication {
    automatic = true
  }
  
  depends_on = [google_project_service.apis]
}

# Google Play Service Account
resource "google_secret_manager_secret" "google_play_service_account" {
  secret_id = "google-play-service-account"
  
  replication {
    automatic = true
  }
  
  depends_on = [google_project_service.apis]
}

# Session Secret
resource "google_secret_manager_secret" "session_secret" {
  secret_id = "session-secret"
  
  replication {
    automatic = true
  }
  
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "session_secret" {
  secret = google_secret_manager_secret.session_secret.id
  secret_data = random_password.session_secret.result
}

resource "random_password" "session_secret" {
  length  = 64
  special = true
}

# Sentry DSN
resource "google_secret_manager_secret" "sentry_dsn" {
  secret_id = "sentry-dsn"
  
  replication {
    automatic = true
  }
  
  depends_on = [google_project_service.apis]
}

# Service account for accessing secrets
resource "google_service_account" "secret_accessor" {
  account_id   = "rapid-tech-store-secrets"
  display_name = "Rapid Tech Store Secrets Accessor"
}

# IAM binding for secret accessor
resource "google_secret_manager_secret_iam_binding" "secret_accessor_bindings" {
  for_each = toset([
    google_secret_manager_secret.database_url.secret_id,
    google_secret_manager_secret.jwt_secret.secret_id,
    google_secret_manager_secret.openai_api_key.secret_id,
    google_secret_manager_secret.google_client_id.secret_id,
    google_secret_manager_secret.google_client_secret.secret_id,
    google_secret_manager_secret.razorpay_key_id.secret_id,
    google_secret_manager_secret.razorpay_key_secret.secret_id,
    google_secret_manager_secret.razorpay_webhook_secret.secret_id,
    google_secret_manager_secret.payoneer_api_key.secret_id,
    google_secret_manager_secret.payoneer_api_secret.secret_id,
    google_secret_manager_secret.payoneer_webhook_secret.secret_id,
    google_secret_manager_secret.sendgrid_api_key.secret_id,
    google_secret_manager_secret.google_play_service_account.secret_id,
    google_secret_manager_secret.session_secret.secret_id,
    google_secret_manager_secret.sentry_dsn.secret_id,
  ])
  
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  members = [
    "serviceAccount:${google_service_account.secret_accessor.email}",
    "serviceAccount:${google_service_account.gke_service_account.email}",
  ]
}

# Workload Identity binding
resource "google_service_account_iam_binding" "workload_identity_binding" {
  service_account_id = google_service_account.secret_accessor.name
  role               = "roles/iam.workloadIdentityUser"
  
  members = [
    "serviceAccount:${var.project_id}.svc.id.goog[rapid-tech-store/rapid-tech-store-sa]",
  ]
}

# Output secret names for reference
output "secret_names" {
  description = "Names of created secrets"
  value = {
    database_url                = google_secret_manager_secret.database_url.secret_id
    jwt_secret                  = google_secret_manager_secret.jwt_secret.secret_id
    openai_api_key             = google_secret_manager_secret.openai_api_key.secret_id
    google_client_id           = google_secret_manager_secret.google_client_id.secret_id
    google_client_secret       = google_secret_manager_secret.google_client_secret.secret_id
    razorpay_key_id           = google_secret_manager_secret.razorpay_key_id.secret_id
    razorpay_key_secret       = google_secret_manager_secret.razorpay_key_secret.secret_id
    razorpay_webhook_secret   = google_secret_manager_secret.razorpay_webhook_secret.secret_id
    payoneer_api_key          = google_secret_manager_secret.payoneer_api_key.secret_id
    payoneer_api_secret       = google_secret_manager_secret.payoneer_api_secret.secret_id
    payoneer_webhook_secret   = google_secret_manager_secret.payoneer_webhook_secret.secret_id
    sendgrid_api_key          = google_secret_manager_secret.sendgrid_api_key.secret_id
    google_play_service_account = google_secret_manager_secret.google_play_service_account.secret_id
    session_secret            = google_secret_manager_secret.session_secret.secret_id
    sentry_dsn               = google_secret_manager_secret.sentry_dsn.secret_id
  }
}