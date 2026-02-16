# Shop Owner Automation (MERN + TypeScript)

A complete rewrite of the original project into a **MERN stack application with TypeScript** to automate day-to-day work for shop owners.

## Stack
- **MongoDB** + Mongoose
- **Express** (TypeScript API)
- **React** + Vite + TypeScript UI
- **Node.js** workspaces for monorepo management

## Project Structure
```
.
├── server/   # Express + TypeScript + MongoDB API
└── client/   # React + TypeScript dashboard app
```

## Features
- Product and inventory management
- Low-stock monitoring
- Payment tracking
- Delivery creation and status management
- Dashboard metrics for core operations

## Setup
1. Install dependencies for all workspaces:
   ```bash
   npm install
   ```
2. Create server environment file:
   ```bash
   cp server/.env.example server/.env
   ```
3. Update `MONGODB_URI` in `server/.env`.

## Run in Development
- API server:
  ```bash
  npm run dev:server
  ```
- Web client:
  ```bash
  npm run dev:client
  ```

> By default the client expects API at `http://localhost:5000/api`.

## Build
```bash
npm run build
```

## API Snapshot
- `GET /api/dashboard`
- `GET/POST/PUT/DELETE /api/products`
- `GET /api/stock/alerts/low`
- `GET/POST/PUT /api/payments`
- `GET/POST/PUT /api/deliveries`

## Notes
- Delivery creation uses MongoDB transactions so stock deduction and delivery creation stay consistent.
- This rewrite intentionally migrates from SQLite/vanilla JS to MongoDB/React/TypeScript.
