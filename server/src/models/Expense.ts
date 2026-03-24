import { Schema, model, Types } from 'mongoose';

const expenseSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['rent', 'utilities', 'salary', 'transport', 'misc', 'other'],
      default: 'misc'
    },
    amount: { type: Number, required: true, min: 0 },
    expenseDate: { type: Date, default: Date.now },
    notes: { type: String, trim: true, default: '' },
    createdBy: { type: Types.ObjectId, required: true, ref: 'User' }
  },
  { timestamps: true }
);

export const Expense = model('Expense', expenseSchema);
