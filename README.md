# finance-dashboard-backend

Backend for a finance dashboard — handles users, roles, financial records, and analytics. Built with Node.js, Express, and MongoDB.

---

## Why I built it this way

A few decisions worth calling out upfront:

**MongoDB over SQL** — financial records are essentially documents. Each one has an amount, a type, a category, a date, and some optional notes. There's no complex relational structure here, so a document store fits naturally. The aggregation pipeline also makes the dashboard analytics queries clean to write.

**Service layer** — controllers in this project are intentionally thin. They receive a request, call a service, and send back a response. All the actual logic (filtering, access checks, business rules) lives in the service layer. This makes things easier to test and easier to change later.

**Soft deletes at the model level** — instead of sprinkling `isDeleted: false` checks across every query, I hooked into Mongoose's pre-query middleware so deleted records are automatically excluded everywhere. You can't accidentally forget it.

**Permission matrix in one file** — `src/config/roles.js` is the single source of truth for who can do what. If access rules change, there's one place to update.

---

## Project structure

```
src/
├── config/
│   ├── env.js              # env vars — read once here, imported everywhere else
│   └── roles.js            # role hierarchy + permission matrix
├── db/
│   ├── connection.js       # connect/disconnect + connection event logging
│   └── seed.js             # creates default users and sample records
├── middleware/
│   ├── auth.js             # JWT verification + role/permission guards
│   ├── validate.js         # wraps Zod schemas into Express middleware
│   └── errorHandler.js     # normalizes all errors into a consistent shape
├── models/
│   ├── User.js             # bcrypt hook, comparePassword, toPublicJSON
│   └── FinancialRecord.js  # soft delete middleware, compound indexes
├── modules/
│   ├── auth/               # login, /me
│   ├── users/              # user management (admin only)
│   ├── records/            # financial record CRUD + filtering
│   └── dashboard/          # aggregation-based analytics
├── utils/
│   ├── ApiError.js         # typed errors + catchAsync
│   ├── response.js         # consistent response envelope
│   └── jwt.js              # sign, verify, extract token
├── validators/
│   └── schemas.js          # all Zod schemas in one place
├── app.js                  # Express setup: middleware, routes, error handlers
└── server.js               # starts server, handles graceful shutdown
```

---

## Stack

- **Node.js + Express** — straightforward, well understood, good for REST APIs
- **MongoDB + Mongoose** — document model, aggregation pipeline for analytics
- **JWT** — stateless auth, works well for this kind of API
- **Zod** — schema validation with good error messages
- **bcryptjs** — password hashing
- **Helmet + express-rate-limit** — basic production hardening

---

## Setup

You need Node 18+ and a MongoDB instance (local or Atlas).

```bash
npm install
cp .env.example .env
```

Fill in your `.env`:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/finance_dashboard
JWT_SECRET=   # generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=10
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
CORS_ORIGIN=*
```

Seed the database (creates 3 users + 15 sample records):

```bash
npm run seed
```

Start the server:

```bash
npm run dev    # uses nodemon
npm start      # plain node
```

---

## Default accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@finance.dev | Admin@123 |
| Analyst | analyst@finance.dev | Analyst@123 |
| Viewer | viewer@finance.dev | Viewer@123 |

---

## API

Base URL: `http://localhost:3000/api/v1`

Protected routes need:
```
Authorization: Bearer <token>
```

Every response uses the same envelope:
```json
{
  "success": true,
  "message": "...",
  "data": {},
  "meta": {}
}
```

---

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | — | Returns a JWT token |
| GET | `/auth/me` | ✅ | Returns current user |

```json
POST /auth/login
{ "email": "admin@finance.dev", "password": "Admin@123" }
```

---

### Users

Admin only.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List users — supports `?role=`, `?status=`, `?search=`, `?page=`, `?limit=` |
| GET | `/users/:id` | Get one user |
| POST | `/users` | Create a user |
| PATCH | `/users/:id` | Update name, role, or status |
| DELETE | `/users/:id` | Deactivate (soft delete) |

```json
POST /users
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "Secure@123",
  "role": "analyst"
}
```

---

### Financial Records

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/records` | viewer+ | List with filters |
| GET | `/records/:id` | viewer+ | Get one record |
| POST | `/records` | admin | Create |
| PATCH | `/records/:id` | admin | Update |
| DELETE | `/records/:id` | admin | Soft delete |

Supported query params on `GET /records`:

| Param | Example | Notes |
|-------|---------|-------|
| `type` | `income` | income or expense |
| `category` | `Salary` | partial match |
| `date_from` | `2024-01-01` | YYYY-MM-DD |
| `date_to` | `2024-03-31` | YYYY-MM-DD |
| `sort` | `date_desc` | date_asc, date_desc, amount_asc, amount_desc |
| `page` | `1` | |
| `limit` | `20` | max 100 |

```json
POST /records
{
  "amount": 85000,
  "type": "income",
  "category": "Salary",
  "date": "2024-01-15",
  "notes": "January salary"
}
```

---

### Dashboard

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/dashboard/summary` | viewer+ | Total income, expenses, net balance |
| GET | `/dashboard/recent` | viewer+ | Recent transactions (`?limit=10`) |
| GET | `/dashboard/by-category` | analyst+ | Breakdown by category |
| GET | `/dashboard/trends/monthly` | analyst+ | Monthly trends (`?year=2024`) |
| GET | `/dashboard/trends/weekly` | analyst+ | Last N weeks (`?weeks=12`) |
| GET | `/dashboard/top-categories` | analyst+ | Top categories (`?type=expense&limit=5`) |

Sample response from `/dashboard/summary`:
```json
{
  "success": true,
  "data": {
    "totalIncome": 430000,
    "totalExpenses": 121800,
    "netBalance": 308200,
    "totalRecords": 15,
    "avgTransactionAmount": 36786.67
  }
}
```

---

## Access control

| Action | Viewer | Analyst | Admin |
|--------|:------:|:-------:|:-----:|
| Login, view profile | ✅ | ✅ | ✅ |
| Read records | ✅ | ✅ | ✅ |
| Create / edit / delete records | ❌ | ❌ | ✅ |
| Dashboard summary + recent | ✅ | ✅ | ✅ |
| Dashboard analytics | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ✅ |

Two middleware helpers in `src/middleware/auth.js`:
- `requireMinRole('analyst')` — passes analyst and admin
- `requirePermission('RECORDS_WRITE')` — checks against the explicit matrix in `config/roles.js`

---

## Errors

Consistent shape across all error types:

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    { "field": "amount", "message": "Amount must be > 0" }
  ]
}
```

| Code | Meaning |
|------|---------|
| 400 | Bad input or invalid operation |
| 401 | Missing or expired token |
| 403 | Not enough permissions |
| 404 | Resource not found |
| 409 | Duplicate (e.g. email already exists) |
| 429 | Rate limit hit |
| 500 | Something unexpected broke |

---

## Data models

**User**

| Field | Type | Notes |
|-------|------|-------|
| name | String | 2–100 chars |
| email | String | unique, lowercased |
| password | String | bcrypt hashed, `select: false` |
| role | String | viewer / analyst / admin |
| status | String | active / inactive |
| lastLoginAt | Date | updated on login |

**FinancialRecord**

| Field | Type | Notes |
|-------|------|-------|
| amount | Number | must be > 0 |
| type | String | income / expense |
| category | String | max 100 chars |
| date | Date | the transaction date |
| notes | String | optional, max 500 chars |
| createdBy | ObjectId | ref to User |
| isDeleted | Boolean | soft delete, hidden by default |
| deletedAt | Date | set on delete |

Indexes on FinancialRecord:
- `{ isDeleted, date }` — general list queries
- `{ isDeleted, type, date }` — type-filtered queries
- `{ isDeleted, category, type }` — category analytics

---

## Assumptions

- Only admins can create or modify records. Analysts and viewers are consumers of data, not producers. This matches how most finance tools work in practice.
- Soft deletes on both users and records. Hard deletes would break audit history and referential integrity.
- Password field uses `select: false` in Mongoose so it's never accidentally returned in a response. It's only fetched explicitly in the login flow.
- Rate limiting has a stricter limit on `/auth/login` specifically to slow down brute force attempts.
- `CORS_ORIGIN=*` is fine for development. In production you'd lock this down to your frontend's actual domain.