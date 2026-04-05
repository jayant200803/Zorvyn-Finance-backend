# Finance-dashboard-backend

Backend for a finance dashboard — handles users, roles, financial records, and analytics. Built with Node.js, Express, and MongoDB.

---

## What this project is

Zrovyn asked for a backend system for a finance dashboard where different users interact with financial records based on their role. The system needed to handle:

- Users with different access levels (not everyone should see or do everything)
- Financial records — income, expenses, categories, dates
- Dashboard analytics — summaries, trends, totals
- Strict control over who can do what
- Proper validation so bad data never reaches the database

This is the backend engine behind that system. It's a REST API that a frontend app or a tool like Postman can talk to over HTTP.

---

## How a request flows through the system

Every single request goes through the same flow:

```
Request comes in
      ↓
Does it have a valid token?    → No  → 401 Unauthorized
      ↓ Yes
Does their role allow this?    → No  → 403 Forbidden
      ↓ Yes
Is the data they sent valid?   → No  → 400 Bad Request
      ↓ Yes
Talk to MongoDB, do the thing
      ↓
Send back a clean JSON response
```

That's the whole backend in one diagram. Every endpoint follows this exact path.

---

## Why I built it this way

**MongoDB over SQL** — financial records are essentially documents. Each one has an amount, a type, a category, a date, and some optional notes. There's no complex relational structure here, so a document store fits naturally. The aggregation pipeline also makes the dashboard analytics queries clean to write — instead of fetching records and calculating totals in JavaScript, we push the calculation down to the database in a single query.

**Service layer** — controllers in this project are intentionally thin. They receive a request, call a service, and send back a response. All the actual logic (filtering, access checks, business rules) lives in the service layer. This makes things easier to test and easier to change later without touching the routing layer.

**Soft deletes at the model level** — instead of sprinkling `isDeleted: false` checks across every query, I hooked into Mongoose's pre-query middleware so deleted records are automatically excluded everywhere. You literally cannot forget it — it's injected at the database layer itself.

**Permission matrix in one file** — `src/config/roles.js` is the single source of truth for who can do what. If access rules change, there's one place to update. No hunting across middleware files.

**All validation schemas in one file** — `src/validators/schemas.js` has every Zod schema in the project. You can read the entire validation layer of the app in one place.

**Consistent response envelope** — every response, success or error, follows the same shape. The frontend never has to guess the structure.

---

## File by file explanation

### `server.js` — Entry point

The first file that runs when you start the server. It connects to MongoDB, creates the Express app, and starts listening on a port. It also handles graceful shutdown — when you press Ctrl+C it waits for ongoing requests to finish and closes the database connection cleanly before exiting. Most people skip this. It matters in production.

### `src/app.js` — Express setup

This is the wiring file. It adds security headers via Helmet, sets up CORS, applies rate limiting (100 requests per 15 minutes globally, stricter on the login route to prevent brute force), adds request logging via Morgan, registers all the routes, and puts the 404 and error handlers at the very end. Nothing runs here — it just connects everything.

### `src/config/env.js` — Environment variables

Instead of writing `process.env.JWT_SECRET` scattered across 10 different files, all environment variables are read once here and exported. Every other file imports from here. If a variable is missing or wrong, you find out when the server starts — not when a random request hits a broken route.

### `src/config/roles.js` — The permission system

One of the most important files. It defines two things:

The **hierarchy** — viewer is level 1, analyst is level 2, admin is level 3.

The **permission matrix** — an explicit list of what each role can do:
```
RECORDS_READ        → viewer, analyst, admin
RECORDS_WRITE       → admin only
RECORDS_DELETE      → admin only
DASHBOARD_BASIC     → viewer, analyst, admin
DASHBOARD_ANALYTICS → analyst, admin
USERS_MANAGE        → admin only
```

To change who can do something, you change it here. One file, one place.

### `src/db/connection.js` — MongoDB connection

Connects to MongoDB and logs connection events — connected, disconnected, errors. If MongoDB is unreachable when the server starts, this throws an error and the server exits. Better to fail loudly than run in a broken state.

### `src/db/seed.js` — Sample data

The script behind `npm run seed`. Clears existing data, creates 3 users (admin, analyst, viewer), and creates 15 sample financial records spread across different months and categories. Anyone who clones the repo gets real data immediately without manually creating anything.

### `src/models/User.js` — User schema

Defines what a user looks like in MongoDB with some smart behavior built in:

- **Password hashing** — before saving, automatically scrambles the password with bcrypt. Plain text passwords are never stored.
- **`select: false` on password** — the password field is never returned in any query unless explicitly requested. No risk of accidentally leaking it in a response.
- **`comparePassword()`** — checks if a given password matches the stored hash. Used only during login.
- **`toPublicJSON()`** — returns only safe fields. Used whenever user data goes into a response.
- **`findByEmailWithPassword()`** — the only place in the codebase where the password is fetched. Used only in the login flow.

### `src/models/FinancialRecord.js` — Financial record schema

Defines financial records with two important features:

- **Compound indexes** — created to match the most common query patterns. `{ isDeleted, date }` makes listing records fast even with large datasets. `{ isDeleted, category, type }` makes category analytics fast.
- **Soft delete query middleware** — hooked into Mongoose so `isDeleted: false` is added automatically to every find and count query. Deleted records are invisible by default across the entire application without anyone having to remember to filter them.

### `src/middleware/auth.js` — Authentication and authorization

Two jobs:

**`authenticate`** — reads the JWT from the Authorization header, verifies it, looks up the user in the database, attaches them to `req.user`. If the token is missing, expired, or the user is deactivated — request stops with a 401.

**`requirePermission('RECORDS_WRITE')`** — checks if the logged-in user's role has the given permission in the matrix. If not, returns 403. This is what sits on every protected route.

**`requireMinRole('analyst')`** — checks by hierarchy number instead. Allows analyst and anyone above.

### `src/middleware/validate.js` — Input validation

Takes a Zod schema and turns it into Express middleware. Instead of writing validation logic inside every controller, you attach it to a route:

```js
router.post('/records', validate(createRecordSchema), controller.createRecord)
```

If the request body doesn't match the schema, it returns a 400 with exactly which fields failed and why — before the controller even runs.

### `src/middleware/errorHandler.js` — Global error handling

Catches every error thrown anywhere in the app and turns it into a consistent JSON response. Handles our own typed errors, Mongoose validation errors, duplicate key errors (like a duplicate email), invalid MongoDB ID errors, and anything unexpected. Without this, Express returns HTML error pages or crashes.

### `src/utils/ApiError.js` — Typed errors

Instead of throwing generic errors, we throw typed ones:

```js
throw ApiError.notFound('User')               // 404
throw ApiError.forbidden()                    // 403
throw ApiError.conflict('Email already exists') // 409
```

Also contains `catchAsync` — wraps every async route handler so errors automatically flow to the error handler without needing try/catch blocks everywhere.

### `src/utils/response.js` — Response helpers

`sendSuccess`, `sendCreated`, `sendPaginated` — every successful response goes through one of these. Guarantees the response shape is always the same regardless of which controller sends it.

### `src/utils/jwt.js` — Token utilities

Three functions: sign a token, verify a token, extract a token from a Bearer header. All JWT logic in one place.

### `src/validators/schemas.js` — All Zod schemas

Every input validation schema in the project lives here — login, create user, update user, create record, list records filters, dashboard filters. Reading this file gives you the complete picture of what data the API accepts.

### The modules — auth, users, records, dashboard

Each module follows the same pattern:

**`routes.js`** — defines URLs, which middleware runs on each route, which controller handles it

**`controller.js`** — receives the request, calls the service, sends the response. Thin by design — no logic here.

**`service.js`** — the actual business logic. Database queries, business rules, error throwing. This is where things actually happen.

For example, `POST /api/v1/records`:
```
routes.js      → authenticate → requirePermission → validate → controller
controller.js  → calls recordsService.createRecord()
service.js     → saves to MongoDB, returns the created record
```

### The dashboard service specifically

Worth calling out because it uses MongoDB aggregation pipelines. Instead of fetching all records and doing math in JavaScript, the calculation is pushed to the database:

```
"Sum all income by month for 2024, grouped by month, sorted chronologically"
```

MongoDB returns exactly that in one query. This is what powers the monthly trends, weekly trends, category breakdown, and top categories endpoints. It's fast and doesn't get slower as more records are added.

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