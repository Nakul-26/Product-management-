import mongoose from 'mongoose';

let cachedConnection: typeof mongoose | null = null;

export const connectDb = async (mongoUri: string): Promise<void> => {
  if (cachedConnection) {
    return;
  }

  try {
    const conn = await mongoose.connect(mongoUri);
    cachedConnection = conn;
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};
