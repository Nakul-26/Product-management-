import cors from 'cors';
import express from 'express';
import router from './routes';

const app = express();

const getOrigins = (): string[] => {
  const origin = process.env.CLIENT_ORIGIN;
  if (!origin) return ['http://localhost:5173'];
  return origin.split(',').map(o => o.trim());
};

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = getOrigins();
      
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Check if the origin is in the allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Support preview deployments (e.g., *.product-management-c0p.pages.dev)
      const isAllowedPreview = allowedOrigins.some(baseOrigin => {
        // If it's a pages.dev domain, check if it's a subdomain
        if (baseOrigin.endsWith('.pages.dev')) {
          const domain = baseOrigin.replace(/^https?:\/\//, '');
          return origin.endsWith(domain);
        }
        return false;
      });

      if (isAllowedPreview) {
        return callback(null, true);
      }

      callback(null, false);
    },
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
