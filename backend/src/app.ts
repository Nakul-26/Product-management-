import cors from 'cors';
import express from 'express';
import router from './routes';

const app = express();

const getOrigins = () => {
  const origin = process.env.CLIENT_ORIGIN;
  if (!origin) return 'http://localhost:5173';
  if (origin.includes(',')) return origin.split(',').map(o => o.trim());
  return origin;
};

app.use(
  cors({
    origin: getOrigins(),
    credentials: true
  })
);
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK' });
});

app.use('/api', router);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

export default app;
