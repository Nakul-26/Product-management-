import { Schema, model, Types } from 'mongoose';

const deliveryItemSchema = new Schema(
  {
    productId: { type: Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 }
  },
  { _id: false }
);

const deliverySchema = new Schema(
  {
    orderId: String,
    customerName: { type: String, required: true },
    customerAddress: { type: String, required: true },
    customerPhone: String,
    deliveryDate: Date,
    trackingNumber: String,
    notes: String,
    deliveryStatus: {
      type: String,
      enum: ['pending', 'in_transit', 'delivered'],
      default: 'pending'
    },
    items: { type: [deliveryItemSchema], default: [] }
  },
  { timestamps: true }
);

export const Delivery = model('Delivery', deliverySchema);
