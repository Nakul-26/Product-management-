import { Schema, model, Types } from 'mongoose';

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    parent: { type: Types.ObjectId, ref: 'Category', default: null },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    createdBy: { type: Types.ObjectId, required: true, ref: 'User' }
  },
  { timestamps: true }
);

categorySchema.index({ name: 1, parent: 1 }, { unique: true });

export const Category = model('Category', categorySchema);
