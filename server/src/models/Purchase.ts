import { Schema, model, Types } from 'mongoose';

const purchaseItemSchema = new Schema(
  {
    productId: { type: Types.ObjectId, required: true, ref: 'Product' },
    quantity: { type: Number, required: true, min: 1 },
    costPrice: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const purchaseSchema = new Schema(
  {
    supplierName: { type: String, required: true, trim: true },
    items: { type: [purchaseItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    purchaseDate: { type: Date, default: Date.now },
    createdBy: { type: Types.ObjectId, required: true, ref: 'User' }
  },
  { timestamps: true }
);

export const Purchase = model('Purchase', purchaseSchema);
