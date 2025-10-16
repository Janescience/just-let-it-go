import mongoose, { Schema, Document } from 'mongoose';
import { StockMovement } from '@/types';
import { now } from '@/utils/timezone';

interface IStockMovement extends Omit<StockMovement, '_id'>, Document {}

const StockMovementSchema = new Schema<IStockMovement>({
  ingredientId: {
    type: String,
    ref: 'Ingredient',
    required: true,
  },
  ingredientName: {
    type: String,
    trim: true,
  },
  unit: {
    type: String,
    trim: true,
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
    type: String,
    ref: 'Booth',
  },
  saleId: {
    type: String,
    ref: 'Sale',
  },
  saleQuantity: {
    type: Number,
    min: 0,
  },
  saleAmount: {
    type: Number,
    min: 0,
  },
  createdAt: {
    type: Date,
  },
  updatedAt: {
    type: Date,
  },
});

// Set timestamps with Thailand time
StockMovementSchema.pre('save', function(next) {
  const currentTime = now();

  if (this.isNew) {
    this.createdAt = currentTime;
  }
  this.updatedAt = currentTime;

  next();
});

StockMovementSchema.index({ ingredientId: 1, createdAt: -1 });
StockMovementSchema.index({ boothId: 1, createdAt: -1 });
StockMovementSchema.index({ type: 1, createdAt: -1 });

export default mongoose.models.StockMovement || mongoose.model<IStockMovement>('StockMovement', StockMovementSchema);