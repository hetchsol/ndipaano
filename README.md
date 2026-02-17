# Ndipaano - Medical Home Care Platform

A comprehensive medical home care platform connecting Zambian patients with healthcare practitioners for on-demand and scheduled services. Built with compliance for HPCZ, ZAMRA, DPA No. 3 of 2021, and NHIMA regulations.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + pnpm |
| Mobile | React Native + Expo |
| Web Portal | Next.js 14 (App Router) |
| Backend | NestJS (TypeScript) |
| ORM | Prisma |
| Database | PostgreSQL 16 + PostGIS |
| Cache/Queue | Redis + BullMQ |
| Real-time | Socket.io |
| Auth | Passport.js + JWT + TOTP 2FA |
| Payments | Paystack + Mobile Money |
| Deployment | Render |

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose (for local database/Redis)

## Getting Started

### 1. Clone & Install

```bash
git clone <repo-url> ndipaano
cd ndipaano
pnpm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Start Infrastructure

```bash
docker-compose up -d
```

This starts PostgreSQL (port 5432), Redis (port 6379), and MinIO (port 9000).

### 4. Database Setup

```bash
cd apps/api
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

### 5. Start Development

```bash
# From root - starts all apps
pnpm dev

# Or individually:
pnpm --filter api start:dev     # API on http://localhost:3001
pnpm --filter web dev           # Web on http://localhost:3000
pnpm --filter mobile dev        # Mobile (Expo)
```

### 6. Access

- **API**: http://localhost:3001
- **Swagger Docs**: http://localhost:3001/api/docs
- **Web Portal**: http://localhost:3000
- **MinIO Console**: http://localhost:9001

## Test Accounts (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ndipaano.co.zm | Password123! |
| Patient | chanda.mwamba@gmail.com | Password123! |
| Patient | mutale.banda@gmail.com | Password123! |
| Doctor | dr.tembo@ndipaano.co.zm | Password123! |
| Nurse | nurse.phiri@ndipaano.co.zm | Password123! |
| Physiotherapist | physio.lungu@ndipaano.co.zm | Password123! |
| Unverified | dr.pending@ndipaano.co.zm | Password123! |

## Project Structure

```
ndipaano/
├── apps/
│   ├── api/          # NestJS backend (13 modules)
│   ├── web/          # Next.js web portal
│   └── mobile/       # React Native + Expo app
├── packages/
│   └── shared/       # Shared types, validation, constants
├── docker-compose.yml
├── render.yaml       # Render deployment blueprint
└── turbo.json
```

## API Modules

- **Auth** - JWT authentication, registration, 2FA (TOTP), password reset
- **Users** - Patient profiles, family members, data export
- **Practitioners** - Profiles, credentials, HPCZ verification, availability
- **Bookings** - Scheduling, lifecycle management, conflict detection
- **Tracking** - WebSocket real-time location during home visits
- **Payments** - Paystack integration, commission calculation, payouts
- **Medical Records** - Encrypted records with consent-gated access
- **Prescriptions** - ZAMRA-compliant prescription management
- **Notifications** - Push, SMS, email via BullMQ queues
- **Compliance** - Audit logs, consent management, DPA compliance
- **Admin** - Dashboard, user management, verification queue
- **Search** - Geolocation-based practitioner search
- **Emergency** - Panic button, emergency contacts

## Deployment (Render)

The `render.yaml` blueprint configures:
- Web service for NestJS API
- Web service for Next.js portal
- Managed PostgreSQL 16
- Managed Redis

```bash
# Deploy via Render Dashboard or CLI
render blueprint apply
```

## Testing

```bash
pnpm test              # Unit tests
pnpm --filter api test:e2e  # E2E tests
```

## Compliance

- **DPA No. 3 of 2021**: Consent tracking, data subject requests, breach notifications
- **HPCZ**: Practitioner verification workflow, certificate tracking
- **ZAMRA**: Controlled substance prescriptions, pharmacy registration
- **NHIMA**: Insurance claim integration stubs

## License

Private - All rights reserved.
