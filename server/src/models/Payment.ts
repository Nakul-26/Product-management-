import { Schema, model } from 'mongoose';

const paymentSchema = new Schema(
  {
    orderId: String,
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, required: true },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    },
    customerName: String,
    customerEmail: String,
    notes: String
  },
  { timestamps: true }
);

export const Payment = model('Payment', paymentSchema);
