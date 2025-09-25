import mongoose, { Schema, Document } from 'mongoose';
import { DailySummary } from '@/types';

interface IDailySummary extends Omit<DailySummary, '_id'>, Document {}

const DailySummarySchema = new Schema<IDailySummary>({
  boothId: {
    type: Schema.Types.ObjectId,
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
      type: Schema.Types.ObjectId,
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
}, {
  timestamps: true,
});

DailySummarySchema.index({ boothId: 1, date: 1 }, { unique: true });
DailySummarySchema.index({ date: -1 });

export default mongoose.models.DailySummary || mongoose.model<IDailySummary>('DailySummary', DailySummarySchema);