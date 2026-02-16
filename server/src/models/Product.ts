import { Schema, model, Types } from 'mongoose';

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, trim: true, unique: true, uppercase: true, sparse: true },
    barcode: { type: String, trim: true, unique: true, sparse: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, required: true, min: 0 },
    category: { type: Types.ObjectId, required: true, ref: 'Category' },
    stock: { type: Number, required: true, min: 0, default: 0 },
    lowStockThreshold: { type: Number, required: true, min: 0, default: 5 },
    images: { type: [String], default: [] },
    expiryDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    createdBy: { type: Types.ObjectId, required: true, ref: 'User' }
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', sku: 'text', barcode: 'text', description: 'text' });

export const Product = model('Product', productSchema);
