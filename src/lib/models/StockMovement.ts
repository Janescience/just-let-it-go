import mongoose, { Schema, Document } from 'mongoose';
import { StockMovement } from '@/types';

interface IStockMovement extends Omit<StockMovement, '_id'>, Document {}

const StockMovementSchema = new Schema<IStockMovement>({
  ingredientId: {
    type: Schema.Types.ObjectId,
    ref: 'Ingredient',
    required: true,
  },
  type: {
    type: String,
    enum: ['purchase', 'use', 'waste', 'adjustment'],
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  cost: {
    type: Number,
    min: 0,
  },
  reason: {
    type: String,
    trim: true,
  },
  boothId: {
    type: Schema.Types.ObjectId,
    ref: 'Booth',
  },
  saleId: {
    type: Schema.Types.ObjectId,
    ref: 'Sale',
  },
}, {
  timestamps: { createdAt: true, updatedAt: false },
});

StockMovementSchema.index({ ingredientId: 1, createdAt: -1 });
StockMovementSchema.index({ boothId: 1, createdAt: -1 });
StockMovementSchema.index({ type: 1, createdAt: -1 });

export default mongoose.models.StockMovement || mongoose.model<IStockMovement>('StockMovement', StockMovementSchema);