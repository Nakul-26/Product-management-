import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { connectDb } from './config/db';
import router from './routes';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use('/api', router);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const boot = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required. Copy server/.env.example to server/.env and set it.');
  }
  await connectDb(mongoUri);
  app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
};

boot();
