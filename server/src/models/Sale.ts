import { Schema, model, Types } from 'mongoose';

const saleItemSchema = new Schema(
  {
    productId: { type: Types.ObjectId, required: true, ref: 'Product' },
    productName: { type: String, required: true },
    sku: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineDiscount: { type: Number, default: 0, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    costPriceAtSale: { type: Number, required: true, min: 0 },
    itemRevenue: { type: Number, required: true, min: 0 },
    itemCogs: { type: Number, required: true, min: 0 },
    itemProfit: { type: Number, required: true }
  },
  { _id: false }
);

const saleSchema = new Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    customerName: { type: String, default: 'Walk-in Customer' },
    customerPhone: { type: String, default: '' },
    items: { type: [saleItemSchema], required: true, default: [] },
    subTotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    gstRate: { type: Number, default: 0, min: 0 },
    gstAmount: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    grossRevenue: { type: Number, required: true, min: 0, default: 0 },
    cogs: { type: Number, required: true, min: 0, default: 0 },
    grossProfit: { type: Number, required: true, default: 0 },
    margin: { type: Number, required: true, default: 0 },
    paymentMethod: { type: String, enum: ['cash', 'upi', 'card'], required: true },
    notes: { type: String, default: '' },
    createdBy: { type: Types.ObjectId, required: true, ref: 'User' }
  },
  { timestamps: true }
);

saleSchema.index({ createdAt: -1 });

export const Sale = model('Sale', saleSchema);
