# SaaS Subscription Management

Multi-tenant subscription billing backend with **double-entry bookkeeping**, deferred revenue, and a tenant dashboard (EJS + REST API).

## Stack

- Node.js + Express (ESM)
- Sequelize ORM + **PostgreSQL**
- Session + JWT auth (same pattern as original POS project)
- `ApiResponse` / `errorHandler` / `i18n` (ar + en)

## Quick start

```bash
cp .env.example .env   # set DATABASE_URL
npm install
npm run db:migrate
npm start
```

Open: http://127.0.0.1:3000/dashboard/register

## Demo flow

1. **Register** tenant + admin → chart of accounts seeded (Cash, AR, Deferred Revenue, Subscription Revenue)
2. **Plans** → create Bronze $100 / Gold $500
3. **Customers** → add customers
4. **Subscriptions** → link customer + plan + start date
5. **Billing** → `POST /dashboard/billing/run` → invoice + journal: DR AR / CR Deferred Revenue
6. **Payment** → `POST /dashboard/payments` → DR Cash / CR AR
7. **Revenue recognition** → `POST /dashboard/revenue-recognition/run` → DR Deferred Revenue / CR Subscription Revenue
8. **Reports** → income statement & balance sheet

## API (tenant-scoped, session cookie)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/dashboard/auth/register` | Register tenant + admin |
| POST | `/dashboard/auth/signin` | Login |
| CRUD | `/dashboard/plans` | Subscription plans |
| CRUD | `/dashboard/customers` | Customers |
| CRUD | `/dashboard/subscriptions` | Subscriptions |
| POST | `/dashboard/billing/run` | Monthly billing (cron simulation) |
| POST | `/dashboard/payments` | Record payment |
| POST | `/dashboard/revenue-recognition/run` | Recognize revenue |
| GET | `/dashboard/reports/income-statement?from&to` | Income statement |
| GET | `/dashboard/reports/balance-sheet?asOf` | Balance sheet |

All protected routes require session (`credentials: include`). `tenantId` is taken from JWT only — never from client body.

## Accounting

Every financial event goes through `postJournalEntry()` with **debit = credit** validation inside a transaction.

| Event | Debit | Credit |
|-------|-------|--------|
| Invoice | Accounts Receivable | Deferred Revenue |
| Payment | Cash | Accounts Receivable |
| Revenue recognition | Deferred Revenue | Subscription Revenue |

## Deploy (Railway)

1. PostgreSQL service → copy `DATABASE_URL`
2. Web service from GitHub → set env vars → `npm run db:migrate` on deploy
3. Use internal `DATABASE_URL` between services

## Design decisions

- **Kept POS patterns**: folder layout (`controllers`, `helpers`, `routes`, `middleware`), `ApiResponse`, `errorHandler`, dashboard EJS + `PosApi.request`
- **Replaced domain**: removed POS/Merchant/Super-admin; new tenant-scoped subscription + accounting models
- **Multi-tenancy**: row-level isolation via `tenantId` on all business tables
