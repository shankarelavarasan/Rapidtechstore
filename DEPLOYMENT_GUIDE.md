---
layout: default
title: "Deployment Guide"
description: "Comprehensive production deployment guide for Rapid Tech Store platform including cloud infrastructure, CI/CD, and monitoring."
permalink: /deployment-guide.html
---

# 🚀 Rapid Tech Store - Production Deployment Guide

## 📋 Overview

This guide provides comprehensive instructions for deploying Rapid Tech Store to production environments, including cloud infrastructure setup, CI/CD pipelines, and monitoring configurations.

## 🏗️ Infrastructure Architecture

### Cloud Platform: Google Cloud Platform (GCP)
```
Internet → Load Balancer → GKE Cluster → Microservices
                                      ↓
                              Cloud SQL (PostgreSQL)
                                      ↓
                              Cloud Memorystore (Redis)
                                      ↓
                              Cloud Storage (Files)
```

### Core Services
- **Compute**: Google Kubernetes Engine (GKE)
- **Database**: Cloud SQL for PostgreSQL
- **Cache**: Cloud Memorystore for Redis
- **Storage**: Cloud Storage for static assets
- **CDN**: Cloud CDN for global content delivery
- **Monitoring**: Cloud Monitoring + Sentry

## 🔧 Environment Configuration

### Production Environment Variables

Create `.env.production` file:

```bash
# Application
NODE_ENV=production
PORT=3000
APP_URL=https://rapidtechstore.com
API_URL=https://api.rapidtechstore.com

# Database
DATABASE_URL=postgresql://username:password@host:5432/rapidtechstore_prod
REDIS_URL=redis://redis-host:6379

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-here
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# Payment Gateways
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
PAYONEER_API_KEY=your-payoneer-api-key
PAYONEER_SECRET=your-payoneer-secret

# AI Services
OPENAI_API_KEY=your-openai-api-key
OPENAI_ORG_ID=your-openai-org-id

# Cloud Storage
GCS_BUCKET_NAME=rapidtechstore-assets
GCS_PROJECT_ID=your-gcp-project-id
GCS_KEY_FILE=path/to/service-account-key.json

# Email Service
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@rapidtechstore.com

# Monitoring
SENTRY_DSN=your-sentry-dsn
NEW_RELIC_LICENSE_KEY=your-newrelic-license-key

# Security
CORS_ORIGIN=https://rapidtechstore.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Kubernetes Secrets

```yaml
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: rapidtech-secrets
  namespace: rapidtech-prod
type: Opaque
stringData:
  DATABASE_URL: "postgresql://username:password@host:5432/rapidtechstore_prod"
  JWT_SECRET: "your-super-secure-jwt-secret-here"
  RAZORPAY_KEY_SECRET: "your-razorpay-key-secret"
  OPENAI_API_KEY: "your-openai-api-key"
  SENDGRID_API_KEY: "your-sendgrid-api-key"
```

## 🐳 Docker Configuration

### Production Dockerfile

```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

WORKDIR /app

COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "start"]
```

## ☸️ Kubernetes Deployment

### Namespace Configuration

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: rapidtech-prod
  labels:
    name: rapidtech-prod
    environment: production
```

### Deployment Configuration

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rapidtech-api
  namespace: rapidtech-prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rapidtech-api
  template:
    metadata:
      labels:
        app: rapidtech-api
    spec:
      containers:
      - name: rapidtech-api
        image: gcr.io/your-project/rapidtech-store:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        envFrom:
        - secretRef:
            name: rapidtech-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Service Configuration

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: rapidtech-api-service
  namespace: rapidtech-prod
spec:
  selector:
    app: rapidtech-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
```

### Ingress Configuration

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rapidtech-ingress
  namespace: rapidtech-prod
  annotations:
    kubernetes.io/ingress.class: "gce"
    kubernetes.io/ingress.global-static-ip-name: "rapidtech-ip"
    networking.gke.io/managed-certificates: "rapidtech-ssl-cert"
spec:
  rules:
  - host: api.rapidtechstore.com
    http:
      paths:
      - path: /*
        pathType: ImplementationSpecific
        backend:
          service:
            name: rapidtech-api-service
            port:
              number: 80
```

## 🔄 CI/CD Pipeline

### Google Cloud Build Configuration

```yaml
# cloudbuild.yaml
steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/rapidtech-store:$COMMIT_SHA', '.']
  
  # Push the container image to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/rapidtech-store:$COMMIT_SHA']
  
  # Deploy to GKE
  - name: 'gcr.io/cloud-builders/gke-deploy'
    args:
    - run
    - --filename=k8s/
    - --image=gcr.io/$PROJECT_ID/rapidtech-store:$COMMIT_SHA
    - --location=us-central1-a
    - --cluster=rapidtech-cluster

options:
  logging: CLOUD_LOGGING_ONLY
```

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Build application
      run: npm run build
    
    - name: Setup Google Cloud CLI
      uses: google-github-actions/setup-gcloud@v1
      with:
        service_account_key: ${{ secrets.GCP_SA_KEY }}
        project_id: ${{ secrets.GCP_PROJECT_ID }}
    
    - name: Configure Docker to use gcloud
      run: gcloud auth configure-docker
    
    - name: Build and push Docker image
      run: |
        docker build -t gcr.io/${{ secrets.GCP_PROJECT_ID }}/rapidtech-store:${{ github.sha }} .
        docker push gcr.io/${{ secrets.GCP_PROJECT_ID }}/rapidtech-store:${{ github.sha }}
    
    - name: Deploy to GKE
      run: |
        gcloud container clusters get-credentials rapidtech-cluster --zone us-central1-a
        kubectl set image deployment/rapidtech-api rapidtech-api=gcr.io/${{ secrets.GCP_PROJECT_ID }}/rapidtech-store:${{ github.sha }}
```

## 📊 Monitoring & Logging

### Health Check Endpoints

```javascript
// health.js
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version
  });
});

app.get('/ready', async (req, res) => {
  try {
    // Check database connection
    await db.raw('SELECT 1');
    
    // Check Redis connection
    await redis.ping();
    
    res.status(200).json({
      status: 'ready',
      database: 'connected',
      cache: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error.message
    });
  }
});
```

### Monitoring Configuration

```yaml
# monitoring.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: monitoring-config
  namespace: rapidtech-prod
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
    - job_name: 'rapidtech-api'
      static_configs:
      - targets: ['rapidtech-api-service:80']
```

## 🔒 Security Configuration

### Network Policies

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: rapidtech-network-policy
  namespace: rapidtech-prod
spec:
  podSelector:
    matchLabels:
      app: rapidtech-api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 443
    - protocol: TCP
      port: 5432
    - protocol: TCP
      port: 6379
```

### SSL/TLS Configuration

```yaml
# ssl-cert.yaml
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: rapidtech-ssl-cert
  namespace: rapidtech-prod
spec:
  domains:
    - rapidtechstore.com
    - api.rapidtechstore.com
    - www.rapidtechstore.com
```

## 📈 Scaling Configuration

### Horizontal Pod Autoscaler

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: rapidtech-hpa
  namespace: rapidtech-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: rapidtech-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## 🚀 Deployment Commands

### Initial Deployment

```bash
# 1. Create GKE cluster
gcloud container clusters create rapidtech-cluster \
  --zone us-central1-a \
  --num-nodes 3 \
  --enable-autoscaling \
  --min-nodes 1 \
  --max-nodes 10

# 2. Apply Kubernetes configurations
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml

# 3. Verify deployment
kubectl get pods -n rapidtech-prod
kubectl get services -n rapidtech-prod
kubectl get ingress -n rapidtech-prod
```

### Update Deployment

```bash
# Update image
kubectl set image deployment/rapidtech-api \
  rapidtech-api=gcr.io/your-project/rapidtech-store:new-tag \
  -n rapidtech-prod

# Check rollout status
kubectl rollout status deployment/rapidtech-api -n rapidtech-prod

# Rollback if needed
kubectl rollout undo deployment/rapidtech-api -n rapidtech-prod
```

## 📋 Production Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Secrets created in Kubernetes
- [ ] SSL certificates provisioned
- [ ] Database migrations completed
- [ ] Load testing performed
- [ ] Security scanning completed

### Post-Deployment
- [ ] Health checks passing
- [ ] Monitoring alerts configured
- [ ] Backup procedures tested
- [ ] Performance metrics baseline established
- [ ] Documentation updated
- [ ] Team notified of deployment

### Ongoing Maintenance
- [ ] Regular security updates
- [ ] Performance monitoring
- [ ] Cost optimization reviews
- [ ] Backup verification
- [ ] Disaster recovery testing

---

## 📞 Support & Maintenance

### Production Support Team
- **DevOps Lead**: Shankar Elavarasan
- **Email**: shankarelavarasan90@gmail.com
- **On-call**: 24/7 monitoring with PagerDuty

### Emergency Procedures
1. **Incident Response**: Follow runbook in `/docs/incident-response.md`
2. **Rollback**: Use `kubectl rollout undo` for quick rollbacks
3. **Scaling**: Adjust HPA settings for traffic spikes
4. **Database Issues**: Contact DBA team immediately

---

*This deployment guide ensures Rapid Tech Store runs reliably in production with proper monitoring, security, and scalability configurations.*