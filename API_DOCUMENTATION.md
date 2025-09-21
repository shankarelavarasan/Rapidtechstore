---
layout: default
title: "API Documentation"
description: "Comprehensive API documentation for Rapid Tech Store platform including endpoints, authentication, and integration guides."
permalink: /api-documentation.html
---

# Rapid Tech Store API Documentation

## Overview

The Rapid Tech Store API provides a comprehensive platform for managing an independent software marketplace. This API supports developer onboarding, app publishing, payment processing, user management, and analytics.

## Base URL

```
Production: https://api.rapidtechstore.com
Staging: https://staging-api.rapidtechstore.com
Development: http://localhost:3000
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Rate Limiting

- **General API**: 100 requests per minute per IP
- **Authentication**: 10 requests per minute per IP
- **File Uploads**: 5 requests per minute per user
- **Payment APIs**: 20 requests per minute per user

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {},
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## API Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "role": "USER", // USER, DEVELOPER, ADMIN
  "companyName": "Tech Corp", // Required for DEVELOPER role
  "website": "https://techcorp.com" // Required for DEVELOPER role
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER",
    "isVerified": false
  },
  "token": "jwt-token"
}
```

#### Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### Refresh Token
```http
POST /api/auth/refresh
```

#### Logout
```http
POST /api/auth/logout
```

#### Verify Email
```http
POST /api/auth/verify-email
```

**Request Body:**
```json
{
  "token": "verification-token"
}
```

### Apps Management

#### Get Apps
```http
GET /api/apps
```

**Query Parameters:**
- `category` (string): Filter by category
- `minPrice` (number): Minimum price filter
- `maxPrice` (number): Maximum price filter
- `sortBy` (string): Sort by field (name, price, downloads, rating, createdAt)
- `order` (string): Sort order (asc, desc)
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)

**Response:**
```json
{
  "apps": [
    {
      "id": "uuid",
      "name": "App Name",
      "description": "App description",
      "category": "PRODUCTIVITY",
      "price": 9.99,
      "iconUrl": "https://example.com/icon.png",
      "screenshots": ["url1", "url2"],
      "downloadCount": 1000,
      "rating": 4.5,
      "reviewCount": 50,
      "developer": {
        "id": "uuid",
        "name": "Developer Name",
        "isVerified": true
      },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

#### Get App Details
```http
GET /api/apps/:id
```

#### Search Apps
```http
GET /api/apps/search
```

**Query Parameters:**
- `q` (string): Search query
- `category` (string): Filter by category
- `fuzzy` (boolean): Enable fuzzy search
- `limit` (number): Results limit

#### Get Featured Apps
```http
GET /api/apps/featured
```

#### Get Trending Apps
```http
GET /api/apps/trending
```

#### Get App Recommendations
```http
GET /api/apps/recommendations
```
*Requires authentication*

#### Create App (Developer Only)
```http
POST /api/apps
```

**Request Body:**
```json
{
  "name": "My App",
  "description": "App description",
  "category": "PRODUCTIVITY",
  "price": 9.99,
  "downloadUrl": "https://example.com/app.zip",
  "iconUrl": "https://example.com/icon.png",
  "screenshots": ["url1", "url2"],
  "tags": ["productivity", "tool"],
  "systemRequirements": {
    "minAndroidVersion": "5.0",
    "minIOSVersion": "12.0"
  }
}
```

#### Update App (Developer Only)
```http
PATCH /api/apps/:id
```

#### Delete App (Developer Only)
```http
DELETE /api/apps/:id
```

#### Download App
```http
POST /api/apps/:id/download
```
*Requires authentication and purchase*

### Reviews

#### Get App Reviews
```http
GET /api/apps/:id/reviews
```

#### Create Review
```http
POST /api/apps/:id/reviews
```

**Request Body:**
```json
{
  "rating": 5,
  "comment": "Great app!"
}
```

#### Update Review
```http
PATCH /api/reviews/:id
```

#### Delete Review
```http
DELETE /api/reviews/:id
```

#### Mark Review as Helpful
```http
POST /api/reviews/:id/helpful
```

#### Report Review
```http
POST /api/reviews/:id/report
```

### Payments

#### Create Payment Order
```http
POST /api/payments/orders
```

**Request Body:**
```json
{
  "appId": "uuid",
  "paymentMethod": "STRIPE" // STRIPE, RAZORPAY, PAYONEER
}
```

#### Verify Payment
```http
POST /api/payments/verify
```

**Request Body:**
```json
{
  "orderId": "uuid",
  "paymentId": "payment-gateway-id",
  "signature": "payment-signature"
}
```

#### Get User Orders
```http
GET /api/payments/orders
```

#### Get User Purchases
```http
GET /api/users/purchases
```

#### Request Refund
```http
POST /api/payments/refund
```

### Developer APIs

#### Get Developer Profile
```http
GET /api/developers/profile
```

#### Update Developer Profile
```http
PATCH /api/developers/profile
```

#### Submit Verification Documents
```http
POST /api/developers/verify
```

**Request Body:**
```json
{
  "businessRegistration": "base64-document",
  "governmentId": "base64-document",
  "gstNumber": "GST123456789"
}
```

#### Get Developer Apps
```http
GET /api/developers/apps
```

#### Get Developer Analytics
```http
GET /api/developers/analytics
```

**Query Parameters:**
- `startDate` (string): Start date (ISO format)
- `endDate` (string): End date (ISO format)
- `groupBy` (string): Group by period (day, week, month)

#### Get Developer Earnings
```http
GET /api/developers/earnings
```

#### Request Payout
```http
POST /api/developers/payout
```

**Request Body:**
```json
{
  "amount": 100.00,
  "method": "STRIPE" // STRIPE, RAZORPAY, PAYONEER, WISE
}
```

### Admin APIs

#### Get Admin Dashboard
```http
GET /api/admin/dashboard
```

#### Get Pending Apps
```http
GET /api/admin/apps/pending
```

#### Update App Status
```http
PATCH /api/admin/apps/:id/status
```

**Request Body:**
```json
{
  "status": "APPROVED", // PENDING, APPROVED, REJECTED
  "reason": "Rejection reason" // Required if status is REJECTED
}
```

#### Get All Users
```http
GET /api/admin/users
```

#### Update User Status
```http
PATCH /api/admin/users/:id/status
```

#### Get Reports
```http
GET /api/admin/reports
```

#### Handle Report
```http
PATCH /api/admin/reports/:id
```

#### Get Analytics
```http
GET /api/admin/analytics
```

#### Create Category
```http
POST /api/admin/categories
```

### User Management

#### Get User Profile
```http
GET /api/users/profile
```

#### Update User Profile
```http
PATCH /api/users/profile
```

#### Change Password
```http
POST /api/users/change-password
```

#### Delete Account
```http
DELETE /api/users/account
```

## Webhooks

### Payment Webhooks

#### Stripe Webhook
```http
POST /api/webhooks/stripe
```

#### Razorpay Webhook
```http
POST /api/webhooks/razorpay
```

## Data Models

### User
```json
{
  "id": "uuid",
  "email": "string",
  "name": "string",
  "role": "USER | DEVELOPER | ADMIN",
  "isVerified": "boolean",
  "country": "string",
  "avatar": "string",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### App
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "category": "enum",
  "price": "decimal",
  "iconUrl": "string",
  "screenshots": "string[]",
  "downloadUrl": "string",
  "downloadCount": "number",
  "rating": "decimal",
  "reviewCount": "number",
  "status": "PENDING | APPROVED | REJECTED",
  "developerId": "uuid",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### Review
```json
{
  "id": "uuid",
  "rating": "number",
  "comment": "string",
  "userId": "uuid",
  "appId": "uuid",
  "helpfulCount": "number",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### Payment Order
```json
{
  "id": "uuid",
  "amount": "decimal",
  "currency": "string",
  "status": "PENDING | COMPLETED | FAILED | REFUNDED",
  "gateway": "STRIPE | RAZORPAY | PAYONEER",
  "gatewayOrderId": "string",
  "userId": "uuid",
  "appId": "uuid",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

## Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity
- `429` - Too Many Requests
- `500` - Internal Server Error

## Security

### API Security Features

1. **JWT Authentication**: Secure token-based authentication
2. **Rate Limiting**: Prevents API abuse
3. **Input Validation**: All inputs are validated and sanitized
4. **CORS Protection**: Configured for allowed origins
5. **Helmet.js**: Security headers protection
6. **SQL Injection Protection**: Prisma ORM prevents SQL injection
7. **XSS Protection**: Input sanitization and output encoding

### Payment Security

1. **PCI DSS Compliance**: Through payment gateway partners
2. **Webhook Signature Verification**: All webhooks are verified
3. **Encrypted Storage**: Sensitive data is encrypted at rest
4. **Secure Transmission**: All data transmitted over HTTPS/TLS 1.3

## SDKs and Libraries

### JavaScript/TypeScript SDK
```bash
npm install @rapid-tech-store/sdk
```

### Python SDK
```bash
pip install rapid-tech-store-sdk
```

### PHP SDK
```bash
composer require rapid-tech-store/sdk
```

## Support

- **Documentation**: https://docs.rapidtechstore.com
- **API Status**: https://status.rapidtechstore.com
- **Support Email**: api-support@rapidtechstore.com
- **Developer Portal**: https://developer.rapidtechstore.com

## Changelog

### v1.0.0 (2024-01-01)
- Initial API release
- User authentication and management
- App publishing and discovery
- Payment processing
- Developer tools
- Admin dashboard
- Analytics and reporting