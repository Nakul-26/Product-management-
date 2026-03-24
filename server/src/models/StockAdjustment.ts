import { Schema, model, Types } from 'mongoose';

const stockAdjustmentSchema = new Schema(
  {
    productId: { type: Types.ObjectId, required: true, ref: 'Product' },
    quantityChange: { type: Number, required: true },
    reason: {
      type: String,
      enum: ['damaged', 'expired', 'count_correction', 'theft', 'return', 'other'],
      default: 'other'
    },
    notes: { type: String, trim: true, default: '' },
    createdBy: { type: Types.ObjectId, required: true, ref: 'User' }
  },
  { timestamps: true }
);

export const StockAdjustment = model('StockAdjustment', stockAdjustmentSchema);
