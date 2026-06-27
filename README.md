# SaaS Subscription Management

Multi-tenant subscription billing system with **double-entry bookkeeping**, deferred revenue, revenue recognition, and a full tenant admin dashboard (EJS + REST API).

## Links

| Resource | URL |
| -------- | --- |
| **Live demo** | https://saas-production-04dd.up.railway.app |
| **Repository** | https://github.com/AliSaafan23/SaaS |

## Features

- **Multi-tenancy** — each company (tenant) registers independently; all data isolated by `tenantId`
- **Subscription lifecycle** — plans, customers, subscriptions, monthly billing
- **Double-entry accounting** — journal entries for invoices, payments, and revenue recognition
- **Deferred revenue** — invoices credit deferred revenue; recognition moves it to subscription revenue
- **Financial reports** — income statement, balance sheet, KPI dashboard, debtors, transaction ledger
- **RBAC** — roles & permissions per tenant (owner, admin, accountant, viewer)
- **Dashboard UI** — Arabic/English, dark mode, charts, profile & avatar upload

## Tech stack

| Layer | Technology |
| ----- | ---------- |
| Runtime | Node.js (ESM) + Express |
| Database | **PostgreSQL** (required) |
| ORM | Sequelize |
| Views | EJS + express-ejs-layouts |
| Auth | Session cookie + JWT (`express-session`, `jsonwebtoken`) |
| API | REST under `/dashboard` |
| i18n | ar + en (`i18n` + JSON locale files) |

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm

## Environment variables

Create a `.env` file in the project root:

```env
# Server
PORT=3000
NODE_ENV=development
PUBLIC_HOST=false

# Database (use DATABASE_URL on Railway, or individual vars locally)
DATABASE_URL=postgresql://user:password@localhost:5432/saas_subscription
# Or:
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=saas_subscription
# DB_USER=postgres
# DB_PASSWORD=your_password
# DB_DIALECT=postgres

DATABASE_SSL=false

# Auth
JWT_SECRET=change-me-in-production
SESSION_SECRET=change-me-in-production

# Optional — email verification on register
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# Production
DOMAIN=https://your-app.up.railway.app
```

## Local setup

```bash
git clone https://github.com/AliSaafan23/SaaS.git
cd SaaS
npm install
# Create .env (see above) and set DATABASE_URL
npm run db:migrate
npm start
```

Development with auto-reload:

```bash
npm run start:dev
```

Open:

- Register: http://127.0.0.1:3000/dashboard/register
- Login: http://127.0.0.1:3000/dashboard/login
- Dashboard: http://127.0.0.1:3000/dashboard/home

## End-to-end demo flow

1. **Register** a new tenant + admin user → chart of accounts is seeded automatically:
   - `1000` Cash
   - `1100` Accounts Receivable
   - `2100` Deferred Revenue
   - `4000` Subscription Revenue
2. **Plans** — create e.g. Bronze `$100/month`, Gold `$500/month`
3. **Customers** — add customers for your tenant
4. **Subscriptions** — link customer + plan + start date
5. **Billing** — run monthly billing (UI: Invoices → *Run billing*, or API below)
   - Creates invoice + journal: **DR AR / CR Deferred Revenue**
6. **Payment** — record payment against open invoice (UI: Payments)
   - Journal: **DR Cash / CR AR**
7. **Revenue recognition** — end of period (UI: Reports → *Revenue recognition*)
   - Journal: **DR Deferred Revenue / CR Subscription Revenue**
8. **Reports** — view KPIs, charts, debtors, income statement, balance sheet

## Dashboard pages

| Path | Description |
| ---- | ----------- |
| `/dashboard/home` | Overview — KPIs, charts, debtors, recent activity |
| `/dashboard/ui/plans` | Subscription plans CRUD |
| `/dashboard/ui/customers` | Customers CRUD |
| `/dashboard/ui/subscriptions` | Subscriptions |
| `/dashboard/ui/invoices` | Invoices + run billing |
| `/dashboard/ui/payments` | Record & list payments |
| `/dashboard/ui/reports` | Financial reports & accounting tools |
| `/dashboard/ui/users` | Team users |
| `/dashboard/ui/roles` | Roles & permissions |
| `/dashboard/ui/profile` | Admin profile & avatar |

## API reference

Base path: `/dashboard`  
Auth: session cookie (`credentials: include` in fetch).  
`tenantId` is always taken from the JWT/session — **never** from the request body.

### Auth

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST | `/auth/register` | Register tenant + admin |
| POST | `/auth/signin` | Login |
| POST | `/auth/logout` | Logout |
| POST | `/auth/verify-email` | Verify email code |
| PUT | `/auth/profile` | Update profile / avatar |

### Plans, customers, subscriptions

| Method | Path | Permission |
| ------ | ---- | ---------- |
| GET/POST | `/plans` | `plans.read` / `plans.manage` |
| GET/PUT/DELETE | `/plans/:id` | `plans.read` / `plans.manage` |
| GET/POST | `/customers` | `customers.read` / `customers.manage` |
| GET/PUT/DELETE | `/customers/:id` | `customers.read` / `customers.manage` |
| GET/POST | `/subscriptions` | `subscriptions.read` / `subscriptions.manage` |

### Billing & reports

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/invoices` | List invoices |
| POST | `/billing/run` | Run monthly billing (`{ "runDate": "YYYY-MM-DD" }`) |
| GET | `/payments` | List payments |
| POST | `/payments` | Record payment (`invoiceId`, `amount`, `paymentDate`) |
| POST | `/revenue-recognition/run` | Recognize revenue (`{ "periodEnd": "YYYY-MM-DD" }`) |
| GET | `/revenue-chart?granularity=monthly` | Revenue chart data |
| GET | `/reports/dashboard?from&to` | KPIs, trend, debtors |
| GET | `/reports/transactions?limit=60` | Financial transaction ledger |
| GET | `/reports/income-statement?from&to` | Income statement |
| GET | `/reports/balance-sheet?asOf` | Balance sheet |

### Users & roles

| Method | Path | Permission |
| ------ | ---- | ---------- |
| CRUD | `/users` | `users.manage` |
| CRUD | `/roles` | `roles.manage` |

## Accounting logic

Every financial event uses `postJournalEntry()` with **debit = credit** validation inside a database transaction.

| Event | Debit | Credit |
| ----- | ----- | ------ |
| Monthly invoice | Accounts Receivable (1100) | Deferred Revenue (2100) |
| Customer payment | Cash (1000) | Accounts Receivable (1100) |
| Revenue recognition | Deferred Revenue (2100) | Subscription Revenue (4000) |

**Why deferred revenue?** In SaaS, payment does not equal earned revenue until the service period is delivered. Invoices create a liability (deferred revenue); recognition at period end converts it to actual revenue.

## Multi-tenancy & security

- Row-level isolation: every business table has `tenantId`
- Middleware resolves tenant from session JWT only
- RBAC enforced on API routes and dashboard pages
- Permission `*` = full access (owner role)

## Project structure

```
src/
├── app.js                 # Express app
├── config/                # DB, account codes, permissions
├── controllers/dashboard/ # Request handlers
├── helpers/
│   ├── accounting/        # Billing, payments, reports, journals
│   └── dashboard/         # Auth, return objects, charts
├── middleware/            # Auth, RBAC, validation
├── models/                # Sequelize models
├── routes/dashboard/      # API + page routes
├── views/admin/           # EJS templates
└── utils/                 # Shared utilities
public/admin/              # Dashboard CSS & JS
```

## Deploy (Railway)

1. Create a **PostgreSQL** service → copy `DATABASE_URL`
2. Create a **Web** service from this GitHub repo
3. Set environment variables:
   - `DATABASE_URL` (reference from Postgres service)
   - `NODE_ENV=production`
   - `PUBLIC_HOST=true`
   - `JWT_SECRET`, `SESSION_SECRET` (strong random values)
   - `DOMAIN` = your Railway public URL
4. Run migrations once: `npm run db:migrate`
5. Deploy — Railway runs `npm start`

> **Note:** Uploaded files (avatars, logos) are stored on the container filesystem. For persistent uploads in production, attach a Railway Volume or use external object storage.

## Design decisions

- **Express over NestJS** — same patterns as the original POS codebase; faster delivery with familiar middleware stack
- **Session + JWT** — dashboard uses cookie sessions; API calls reuse the same auth layer
- **Kept shared utilities** — `ApiResponse`, `errorHandler`, `uploadFiles`, `makeDir` conventions
- **Accounting-first billing** — every invoice/payment creates balanced journal lines, not just status flags
- **UI as EJS** — server-rendered admin shell with `PosApi.request()` for JSON APIs (no separate SPA build)

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm start` | Start production server |
| `npm run start:dev` | Start with nodemon |
| `npm run db:migrate` | Run Sequelize migrations |
| `npm run db:migrate:undo` | Undo last migration |
| `npm run db:migrate:status` | Migration status |

## License

ISC
