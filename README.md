# QueueWise — Local Business Queue & Appointment Tracker

A full-stack queue management app for salons, clinics, repair shops and other local businesses. Customers can join a live queue without creating an account; business owners can manage the queue from a protected dashboard.

## Features

### Customer experience
- Browse and search open businesses by name, category or address.
- View the active queue and join with a name (phone is optional).
- Receive a token number, queue position and estimated wait time.
- See queue changes live through Socket.IO.

### Business dashboard
- Owner registration and login (bcrypt password hashing + JWT sessions).
- Create a business profile with category, address and average service duration.
- View active queue and today's visitor/completion metrics.
- Move customers to serving, done or skipped.
- Add walk-in customers.
- Shop ownership is checked before protected operations.

### Engineering
- Express REST API, Mongoose models and MongoDB Atlas support.
- Atomic MongoDB pipeline update for daily token allocation.
- Socket.IO rooms isolate live updates by business.
- Helmet, API rate limiting, input checks and centralized error responses.
- Customer phone numbers are not included in public queue responses.

## Run locally

Requirements: Node.js 18+ and a MongoDB database (MongoDB Atlas free tier works).

```bash
npm install
cp .env.example .env
```

Set `MONGODB_URI` and a long random `JWT_SECRET` in `.env`, then:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Deploy on Render

1. Push this folder to a GitHub repository.
2. Create a new **Web Service** on Render and connect the repository.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables: `MONGODB_URI`, `JWT_SECRET`, and optionally `CLIENT_ORIGIN`.
6. Create a MongoDB Atlas database and allow the Render service to connect. For production, restrict Atlas network access appropriately rather than leaving it open.

The app serves the frontend and API from the same Node service, so no separate static-site deployment is required.

## Main API routes

| Method | Route | Purpose | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Create owner account | No |
| POST | `/api/auth/login` | Owner login | No |
| GET | `/api/shops` | List open businesses | No |
| GET | `/api/shops/:slug` | Public shop + live queue snapshot | No |
| GET | `/api/shops/mine` | List owner's businesses | Yes |
| POST | `/api/shops` | Create business | Yes |
| PATCH | `/api/shops/:id` | Update business | Yes |
| POST | `/api/queue/:shopId/join` | Customer joins queue | No |
| GET | `/api/queue/:shopId` | Owner's active queue | Yes |
| POST | `/api/queue/:shopId/walk-in` | Add walk-in customer | Yes |
| PATCH | `/api/queue/entry/:entryId/status` | Update queue status | Yes |
| GET | `/api/queue/:shopId/analytics` | Today's basic metrics | Yes |
| GET | `/api/health` | Health check | No |

## Socket.IO

- Client emits `join:shop` with the MongoDB shop ID.
- Server emits `queue:updated` to that shop's room after queue mutations.

## Suggested next upgrades

- Real appointment time slots and booking conflict prevention.
- Customer cancellation using a secure, unguessable ticket token.
- WhatsApp/SMS notifications and reminders.
- Historical analytics with Chart.js and actual average service duration.
- Automated tests (Jest/Supertest), structured logging and audit history.
- CSRF/session strategy if switching from bearer tokens to cookies; stronger production validation and monitoring.

## Important MVP notes

This is a functional MVP starter, not a certified production scheduling platform. The current wait-time estimate uses the configured average service duration. It does not guarantee a service start time. Owners should test with a small pilot business before relying on it for customer operations.
