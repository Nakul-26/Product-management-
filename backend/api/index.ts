import app from '../src/app';
import { connectDb } from '../src/config/db';

export default async (req: any, res: any) => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    return res.status(500).json({ error: 'MONGODB_URI is not defined' });
  }
  
  try {
    await connectDb(mongoUri);
    // Express app instance is a function that can handle (req, res)
    return app(req, res);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};
