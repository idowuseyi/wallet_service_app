# Wallet Service - Production-Ready NestJS Application

A comprehensive wallet service built with NestJS, featuring Paystack integration, Google OAuth authentication, API key management, and secure wallet operations.

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=flat&logo=swagger&logoColor=black)](https://swagger.io/)

## ✨ Features

- ✅ **Google OAuth Authentication** - Sign in with Google and automatic wallet creation
- ✅ **JWT-Based Security** - Secure token-based authentication
- ✅ **API Key Management** - Create service-to-service API keys with granular permissions
- ✅ **Paystack Integration** - Deposit funds via Paystack with webhook support
- ✅ **Wallet Operations** - Check balance, deposit, transfer, and view transaction history
- ✅ **Atomic Transactions** - ACID-compliant wallet transfers with pessimistic locking
- ✅ **Permission System** - Role-based access control for API keys (read, deposit, transfer)
- ✅ **Docker Support** - Fully Dockerized with PostgreSQL
- ✅ **Cloud Database Ready** - SSL support for Leapcell, Heroku, Railway, and more
- ✅ **Comprehensive Tests** - Unit and e2e tests with 100% endpoint coverage
- ✅ **Swagger API Documentation** - Interactive API testing at `/api` endpoint

## 🚀 Quick Start

```bash
# Clone the repository
git clone <your-repo-url>
cd wallet-service-app

# Copy environment template
cp .env.example .env

# Update .env with your credentials

# Install dependencies
npm install

# Start with Docker (recommended)
docker-compose up --build
```

**Application URLs:**
- API: http://localhost:6070
- Swagger Docs: http://localhost:6070/api

## 🛠️ Tech Stack

- **Framework**: NestJS 11
- **Language**: TypeScript 5.7
- **Database**: PostgreSQL 15+ with TypeORM
- **Authentication**: Passport.js (Google OAuth2, JWT)
- **Payment Gateway**: Paystack API
- **Validation**: class-validator, Joi
- **Security**: bcrypt, HMAC SHA512
- **API Documentation**: Swagger/OpenAPI 3.0
- **Testing**: Jest (Unit + E2E)
- **Containerization**: Docker & Docker Compose

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Docker** & Docker Compose (for local development)
- **ngrok** (for webhook testing)
- **Paystack Account** with test API keys
- **Google Cloud Project** with OAuth credentials

## ⚙️ Environment Configuration

### Option 1: Local Development (Docker)

```env
PORT=6070
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=wallet_db
DATABASE_SSL=false

JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:6070/auth/google/callback

PAYSTACK_SECRET_KEY=sk_test_your_key
PAYSTACK_PUBLIC_KEY=pk_test_your_key
SERVICE_NAME=wallet-service
```

### Option 2: Cloud Database (Leapcell, Heroku, etc.)

```env
PORT=6070
DATABASE_URL=postgresql://user:pass@host:port/dbname?sslmode=require
DATABASE_SSL=true

JWT_SECRET=your_production_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback

PAYSTACK_SECRET_KEY=sk_live_your_production_key
PAYSTACK_PUBLIC_KEY=pk_live_your_production_key
SERVICE_NAME=wallet-service
```

> 💡 **Tip**: The app automatically detects cloud databases and enables SSL. See [DATABASE_CONFIG.md](DATABASE_CONFIG.md) for details.

## 📦 Installation

### Local Development

```bash
# Install dependencies
npm install

# Start PostgreSQL
docker-compose up -d postgres

# Start application in watch mode
npm run start:dev
```

### Docker (Full Stack)

```bash
# Build and start all services
docker-compose up --build

# Run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run e2e tests
npm run test:e2e

# Test coverage report
npm run test:cov

# Watch mode
npm run test:watch
```

**Test Results:** 14 tests passing (AuthService, ApiKeysService, WalletService, E2E)

## 📖 API Documentation

### Interactive Swagger UI

Access comprehensive API documentation at: **http://localhost:6070/api**

**Features:**
- 🔐 Built-in authentication (JWT & API keys)
- 📝 Request/Response examples
- 🧪 "Try it out" for all endpoints
- 📥 Export OpenAPI specification
- 🎨 Clean, intuitive interface

**Important:** OAuth endpoints (`/auth/google`) must be tested in a browser, not in Swagger.

See [SWAGGER.md](SWAGGER.md) for detailed usage guide.

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/google` | GET | Initiate Google OAuth (browser only) |
| `/auth/google/callback` | GET | OAuth callback, returns JWT |

### API Keys

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/keys` | GET | JWT | Get all my API keys (metadata only) |
| `/keys/create` | POST | JWT | Create new API key (max 5 active) |
| `/keys/:id` | DELETE | JWT | Revoke/delete an API key |
| `/keys/rollover` | POST | JWT | Rollover expired API key |

**Example: Get all my API keys**
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:6070/keys
```

Response:
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "production-service",
    "prefix": "sk_live_a1b2c3d",
    "permissions": ["read", "deposit", "transfer"],
    "status": "active",
    "expiresAt": "2026-01-10T12:00:00.000Z",
    "createdAt": "2025-12-10T12:00:00.000Z"
  },
  {
    "id": "987e6543-e21b-12d3-a456-426614174000",
    "name": "read-only-service",
    "prefix": "sk_live_x9y8z7w",
    "permissions": ["read"],
    "status": "expired",
    "expiresAt": "2025-11-10T12:00:00.000Z",
    "createdAt": "2025-10-10T12:00:00.000Z"
  }
]
```

**Example: Create API key**
```bash
# Create an API key (requires JWT first)
curl -X POST http://localhost:6070/keys/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-service",
    "permissions": ["read", "deposit", "transfer"],
    "expiry": "1M"
  }'
```

**Example: Revoke API key**
```bash
# Revoke a key immediately (e.g., if compromised)
curl -X DELETE http://localhost:6070/keys/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
{
  "message": "API key revoked successfully",
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "production-service",
  "prefix": "sk_live_a1b2c3d",
  "revoked_at": "2025-12-10T13:20:00.000Z"
}
```

> 🔒 **Security Note**: Revoked keys are immediately invalidated and cannot be used for authentication. This is a soft delete - keys remain in the database for audit purposes but are marked as revoked.

**Example: Get all my API keys**
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:6070/keys
```

Response:
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "production-service",
    "prefix": "sk_live_a1b2c3d",
    "permissions": ["read", "deposit", "transfer"],
    "status": "active",
    "expiresAt": "2026-01-10T12:00:00.000Z",
    "createdAt": "2025-12-10T12:00:00.000Z"
  },
  {
    "id": "987e6543-e21b-12d3-a456-426614174000",
    "name": "read-only-service",
    "prefix": "sk_live_x9y8z7w",
    "permissions": ["read"],
    "status": "expired",
    "expiresAt": "2025-11-10T12:00:00.000Z",
    "createdAt": "2025-10-10T12:00:00.000Z"
  }
]
```

**Example: Create API key**
```bash
# Create an API key (requires JWT first)
curl -X POST http://localhost:6070/keys/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-service",
    "permissions": ["read", "deposit", "transfer"],
    "expiry": "1M"
  }'
```

### Wallet Operations

| Endpoint | Method | Auth | Permission | Description |
|----------|--------|------|------------|-------------|
| `/wallet/balance` | GET | JWT/API Key | read | Get wallet balance |
| `/wallet/deposit` | POST | JWT/API Key | deposit | Initialize Paystack deposit |
| `/wallet/paystack/webhook` | POST | Webhook | - | Paystack event handler |
| `/wallet/deposit/:ref/status` | GET | JWT/API Key | read | Check deposit status |
| `/wallet/transfer` | POST | JWT/API Key | transfer | Transfer funds |
| `/wallet/transactions` | GET | JWT/API Key | read | Transaction history |

## 🔑 Authentication Methods

### 1. JWT (User Authentication)

```bash
# Get JWT token by signing in with Google
# Visit: http://localhost:6070/auth/google

# Use the token
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:6070/wallet/balance
```

### 2. API Key (Service-to-Service)

```bash
# Create an API key (requires JWT first)
curl -X POST http://localhost:6070/keys/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-service",
    "permissions": ["read", "deposit", "transfer"],
    "expiry": "1M"
  }'

# Use the API key
curl -H "x-api-key: sk_live_your_api_key" \
  http://localhost:6070/wallet/balance
```

## 💳 Paystack Webhook Testing

### Using the Provided Script

```bash
./start-with-ngrok.sh
```

This automatically:
1. Starts ngrok on port 6070
2. Displays your webhook URL
3. Starts the development server

### Manual Setup

```bash
# Terminal 1: Start ngrok
ngrok http 6070

# Terminal 2: Start application
npm run start:dev

# Update Paystack webhook URL:
# https://your-ngrok-url.ngrok-free.app/wallet/paystack/webhook
```

Update the webhook URL in your [Paystack Dashboard](https://dashboard.paystack.com/#/settings/developer).

## 🔒 Security Features

| Feature | Implementation | Purpose |
|---------|----------------|---------|
| **API Key Hashing** | bcrypt (10 rounds) | Secure key storage |
| **Webhook Verification** | HMAC SHA512 | Verify Paystack events |
| **Idempotent Operations** | Reference-based checks | Prevent double-crediting |
| **Permission System** | Granular access control | API key permissions |
| **Key Rotation** | 5-key limit + rollover | Security best practice |
| **Pessimistic Locking** | Database-level locking | Prevent race conditions |
| **Input Validation** | class-validator | Sanitize all inputs |
| **SQL Injection Protection** | TypeORM parameterized queries | Database security |
| **SSL Support** | Automatic for cloud DBs | Encrypted connections |

## 🏗️ Architecture

### Unified Authentication Guard

Single guard handles both authentication methods:
- **JWT**: Full access to all endpoints
- **API Key**: Permission-based access (read/deposit/transfer)

### Transaction Safety

- **ACID Compliance**: Atomic database transactions
- **Pessimistic Locking**: Row-level locks on wallet updates
- **Rollback Mechanism**: Automatic rollback on failures
- **Idempotency**: Duplicate prevention via unique references

### Webhook Security

- **Signature Verification**: HMAC SHA512 with Paystack secret
- **Idempotency Checks**: Reference-based duplicate detection
- **Atomic Updates**: Balance updates in single transaction

## 📁 Project Structure

```
src/
├── auth/                    # Authentication module
│   ├── strategies/         # Google OAuth & JWT strategies
│   ├── auth.controller.ts  # OAuth endpoints
│   └── auth.service.ts     # Auth business logic
├── api-keys/                # API key management
│   ├── dto/               # Data transfer objects
│   └── api-keys.service.ts # Key creation, validation
├── wallet/                  # Wallet operations
│   ├── services/
│   │   ├── wallet.service.ts   # Core wallet logic
│   │   └── paystack.service.ts # Payment gateway
│   └── wallet.controller.ts    # Wallet endpoints
├── users/                   # User entity
├── transactions/            # Transaction entity
└── common/                  # Shared utilities
    ├── guards/             # Auth & permissions guards
    ├── decorators/         # Custom decorators
    └── utils/              # Helper functions
```

## 🚀 Production Deployment

### Pre-Deployment Checklist

- [ ] Update `.env` with production credentials
- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Use Paystack live keys (`sk_live_*`, `pk_live_*`)
- [ ] Update `GOOGLE_CALLBACK_URL` to production domain
- [ ] Set `NODE_ENV=production`
- [ ] Configure production database with SSL
- [ ] Set up proper logging and monitoring
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure CORS for your frontend domain

### Environment-Specific Features

| Feature | Development | Production |
|---------|-------------|------------|
| Database Sync | ✅ Auto-sync | ❌ Migrations only |
| Logging | ✅ Verbose | ⚠️ Errors only |
| SSL Verification | ❌ Disabled | ✅ Enabled |
| Swagger UI | ✅ Available | ⚠️ Optional (auth protect) |

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL status
docker-compose ps

# View database logs
docker-compose logs postgres

# Verify connection settings
docker-compose exec postgres psql -U postgres -d wallet_db
```

### Paystack Webhook Not Working

1. ✅ Ensure ngrok is running: `ngrok http 6070`
2. ✅ Update webhook URL in Paystack dashboard
3. ✅ Check ngrok requests: http://localhost:4040
4. ✅ Verify `PAYSTACK_SECRET_KEY` is correct
5. ✅ Check webhook signature verification in logs

### OAuth Redirect Mismatch

1. ✅ Verify `GOOGLE_CALLBACK_URL` matches Google Console
2. ✅ Check authorized redirect URIs in Google Cloud
3. ✅ Clear browser cookies and try again

### API Key Issues

```bash
# Check active API keys
# Use JWT to call /keys/create and see existing keys

# Common issues:
# - Max 5 active keys per user
# - Expired keys need rollover
# - Wrong permission for endpoint
```

## 📚 Additional Documentation

- [QUICKSTART.md](QUICKSTART.md) - Quick start guide with examples
- [SWAGGER.md](SWAGGER.md) - Swagger UI usage guide
- [DATABASE_CONFIG.md](DATABASE_CONFIG.md) - Database configuration (local & cloud)
- [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md) - Implementation summary
- [GITHUB_READY.md](GITHUB_READY.md) - Pre-push security checklist

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 💬 Support

- 📧 Email: your-email@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/wallet-service/issues)
- 📖 Docs: [Project Documentation](./docs)

## 🙏 Acknowledgments

- NestJS community for the amazing framework
- Paystack for reliable payment infrastructure
- Google for OAuth authentication

---

**Built with ❤️ using NestJS, TypeScript, and PostgreSQL**
