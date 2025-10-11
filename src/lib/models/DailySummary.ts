import mongoose, { Schema, Document } from 'mongoose';
import { DailySummary } from '@/types';
import { now } from '@/utils/timezone';

interface IDailySummary extends Omit<DailySummary, '_id'>, Document {}

const DailySummarySchema = new Schema<IDailySummary>({
  boothId: {
    type: String,
    ref: 'Booth',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  totalSales: {
    type: Number,
    required: true,
    default: 0,
  },
  totalCost: {
    type: Number,
    required: true,
    default: 0,
  },
  totalProfit: {
    type: Number,
    required: true,
    default: 0,
  },
  itemsSold: [{
    menuItemId: {
      type: String,
      ref: 'MenuItem',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    revenue: {
      type: Number,
      required: true,
      min: 0,
    },
  }],
  createdAt: {
    type: Date,
  },
  updatedAt: {
    type: Date,
  },
});

// Set timestamps with Thailand time
DailySummarySchema.pre('save', function(next) {
  const currentTime = now();

  if (this.isNew) {
    this.createdAt = currentTime;
  }
  this.updatedAt = currentTime;

  next();
});

DailySummarySchema.index({ boothId: 1, date: 1 }, { unique: true });
DailySummarySchema.index({ date: -1 });

export default mongoose.models.DailySummary || mongoose.model<IDailySummary>('DailySummary', DailySummarySchema);