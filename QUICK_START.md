# Quick Start (MERN + TypeScript)

```bash
npm install
cp server/.env.example server/.env
```

Set a valid `MONGODB_URI` in `server/.env`.

Start backend and frontend in separate terminals:

```bash
npm run dev:server
npm run dev:client
```

Open:
- Frontend: `http://localhost:5173`
- API health: `http://localhost:5000/health`
