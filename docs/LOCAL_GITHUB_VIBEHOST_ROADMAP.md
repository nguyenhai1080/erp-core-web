# ERP Core Web - Local -> GitHub -> Vibehost Roadmap

## Current gate

2026-10-07: Local Integration, GitHub baseline, staging API health, migration and
seed have passed. Phase 4 acceptance has passed. Backup download and isolated local restore
passed (DEFAULT, 80 permissions, 14 sequences, ADMIN with 80 permissions, one
applied migration). Storage marker survived Vibehost redeployment. Pushes to
`develop` automatically deployed both API and UI and passed health. Phase 5 is
next, beginning with 0006 Project Execution + Cost. See
`STAGING_INFRASTRUCTURE_ACCEPTANCE.md`.

Schema packs implemented in source:

- 0001 Foundation & Identity
- 0002 Commercial Master
- 0003 Project Pipeline + Quotation
- 0004 Contract Execution + Billing
- 0005 Service Reconciliation + Revenue + Invoice Scope

**Do not continue to 0006 until the Local Integration Gate passes.**

## Phase 1 - Local Integration Gate (Windows)

Target folder:

```text
D:\Projects\ERP-CORE-WEB
```

Prerequisites:

- Git
- Node.js 22 LTS
- Corepack / pnpm
- Docker Desktop
- VS Code (recommended)

Verify:

```powershell
node -v
npm -v
git --version
docker --version
corepack enable
pnpm -v
```

Install source and dependencies:

```powershell
cd D:\Projects\ERP-CORE-WEB
pnpm install
Copy-Item .env.example .env
```

Start PostgreSQL 16:

```powershell
docker compose -f docker-compose.dev.yml up -d
docker ps
```

Prisma compiler gate:

```powershell
pnpm --filter @erp/db exec prisma format
pnpm --filter @erp/db exec prisma validate
pnpm db:generate
```

If any Prisma error appears, stop and fix it before migration or deployment.

Then run migration and seed:

```powershell
pnpm db:migrate
pnpm db:seed
```

Optional DB inspection:

```powershell
pnpm --filter @erp/db exec prisma studio
```

Start API:

```powershell
pnpm --filter @erp/api dev
```

Health gate:

```text
http://localhost:3000/api/v1/health
```

Expected database status: `connected`.

Start web in a second terminal:

```powershell
pnpm --filter @erp/web dev
```

Open:

```text
http://localhost:5173
```

### Local Integration Gate PASS criteria

- pnpm install succeeds
- prisma format succeeds
- prisma validate succeeds
- prisma generate succeeds
- blank PostgreSQL migration succeeds
- seed succeeds
- API health reports DB connected
- web shell loads

## Phase 2 - GitHub

Create repository:

```text
erp-core-web
```

Branch model:

```text
feature/* -> develop -> Vibehost staging
                    \
                     main -> Vibehost production (later)
```

Initial commands:

```powershell
git init
git branch -M main
git add .
git commit -m "chore: bootstrap ERP Core Web baseline"
git remote add origin https://github.com/<user>/erp-core-web.git
git push -u origin main
git checkout -b develop
git push -u origin develop
```

Do not commit `.env` or secrets.

## Phase 3 - Vibehost Staging

Create only after Local Integration Gate PASS.

Create:

1. ERP Core Staging PostgreSQL
2. ERP Core Staging App

Recommended initial DB:

```text
PostgreSQL 16
CPU 0.3 core
RAM 512 MB
pgvector OFF
```

Connect Vibehost application to GitHub branch:

```text
develop
```

Suggested environment variables:

```text
NODE_ENV=production
DATABASE_URL=<Vibehost PostgreSQL connection string>
SESSION_SECRET=<long random secret>
APP_URL=<staging URL>
DEFAULT_COMPANY_CODE=DEFAULT
STORAGE_PROVIDER=local
LOG_LEVEL=info
```

Do not finalize `STORAGE_ROOT` until the persistence test passes.

## Phase 4 - Staging Infrastructure Acceptance

After first successful staging deployment:

1. API health test
2. Database migration test
3. Seed test
4. Persistent storage redeploy test
5. Database backup/download/restore test
6. GitHub `develop` auto-deploy test

If local application files do not survive redeploy, switch the storage adapter to S3-compatible object storage before production document usage.

## Phase 5 - Continue business packs

Only after Local + Staging baseline is stable:

- 0006 Project Execution + Cost
- 0007 Invoice + AR/AP
- 0008 Payment + Allocation + Ledger
- 0009 Closure + Liquidation
- 0010 Reporting + Snapshots

Development loop:

```text
Local feature branch
-> local tests
-> GitHub feature branch
-> merge develop
-> Vibehost staging
-> UAT
```

## Phase 6 - Production

Production is created only after:

- 0010 completed
- financial integrity tests pass
- RBAC tests pass
- storage persistence strategy is confirmed
- DB backup + restore test passes
- RC/UAT passes

Production branch:

```text
main
```

Release flow:

```text
develop
-> release/v1.0.0-rc.1
-> UAT
-> main
-> tag v1.0.0
-> Vibehost production
```
