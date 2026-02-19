# Product / Inventory / Sales ERP (MERN + TypeScript)

A production-style baseline setup for a Product / Inventory / Sales ERP with clean frontend-backend separation.

## Stack
- **Backend**: Node.js, Express, TypeScript, MongoDB (Mongoose)
- **Frontend**: React, Vite, TypeScript
- **Monorepo**: npm workspaces (`server`, `client`)

## Project Structure
```text
product-management/
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── app.ts
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── server.ts
└── client/
    └── src/
        ├── api/
        ├── pages/
        ├── components/
        ├── layouts/
        ├── App.tsx
        └── main.tsx
```

## Setup
1. Install workspace dependencies:
   ```bash
   npm install
   ```
2. Configure backend environment:
   ```bash
   cp server/.env.example server/.env
   ```
3. Update `MONGODB_URI` in `server/.env` if needed.

## Run
```bash
npm run dev:server
npm run dev:client
```

## Health Check
- Backend: `GET http://localhost:5000/api/health` → `{ "status": "OK" }`
- Frontend calls this endpoint on load and logs the response in browser console.
