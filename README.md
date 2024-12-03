# Lexora API

Backend API for the Lexora platform, providing authentication, organization management, and standards management functionality.

## Project Structure

```
lexora-api/
├── api/                    # API modules
│   ├── auth/              # Authentication endpoints
│   ├── users/             # User management
│   ├── organizations/     # Organization & team management
│   ├── standards/         # Standards management
│   ├── topics/           # Topics management
│   └── fda_organization/ # FDA organization management
├── config/                # Configuration files
│   ├── auth.config.js    # Authentication configuration
│   ├── passport.config.js # Passport.js strategies
│   └── swagger.config.js  # API documentation
├── middleware/            # Custom middleware
│   └── auth.middleware.js # Authentication middleware
├── scripts/              # Utility scripts
│   ├── setup-db.js      # Database initialization
│   └── import.js        # Data import utilities
├── assets/              # Static assets
└── utils/              # Utility functions
```

## Features

- Authentication

  - Magic Link Authentication
  - Google OAuth2 Integration
  - Microsoft Azure AD Integration
  - JWT Token Management
  - Session Management

- Organization Management

  - Multi-tenant Support
  - Team Management
  - License/Seats Management

- API Documentation
  - Swagger/OpenAPI Documentation
  - Interactive API Testing Interface

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment variables:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Initialize database:

   ```bash
   node scripts/setup-db.js
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

## API Documentation

Access the API documentation at: http://localhost:3002/api-docs

## Authentication Methods

1. Magic Link:

   - Email-based passwordless authentication
   - Secure token generation and verification

2. Google OAuth2:

   - Sign in with Google account
   - Profile and email synchronization

3. Microsoft Azure AD:
   - Enterprise single sign-on
   - Azure AD integration

## Database Schema

- users: User accounts and authentication
- organizations: Organization management
- teams: Team structure
- licenses: License and seat management
- standards: Standards documentation
- topics: Topic categorization
- fda_organization: FDA organization data

## Environment Variables

Required environment variables:

```env
# Server
PORT=3002
NODE_ENV=development
BASE_URL=http://localhost:3002
FRONTEND_URL=http://localhost:3000

# Database
DB_USER=postgres
DB_HOST=localhost
DB_NAME=lexora
DB_PASSWORD=your-password
DB_PORT=5432

# Authentication
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_TENANT_ID=your-tenant-id

# Email (Magic Links)
EMAIL_FROM=noreply@yourdomain.com
EMAIL_HOST=smtp.yourdomain.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email-user
EMAIL_PASS=your-email-password
```

## Scripts

- `npm run dev`: Start development server
- `npm start`: Start production server
- `node scripts/setup-db.js`: Initialize database schema

## API Endpoints

Detailed API documentation available at `/api-docs`. Main endpoint groups:

- `/api/auth/*`: Authentication endpoints
- `/api/users/*`: User management
- `/api/organizations/*`: Organization management
- `/api/standards/*`: Standards management
- `/api/topics/*`: Topics management
- `/api/fda_organization/*`: FDA organization management
