import { Schema, model } from 'mongoose';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['owner', 'staff'], default: 'staff' },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const User = model('User', userSchema);
