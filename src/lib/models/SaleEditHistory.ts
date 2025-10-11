import mongoose from 'mongoose';
import { now } from '@/utils/timezone';

const SaleEditHistorySchema = new mongoose.Schema({
  saleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    required: true
  },
  boothId: {
    type: String,
    ref: 'Booth',
    required: true
  },
  editedBy: {
    type: String,
    required: true // User name who made the edit
  },
  editedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  editType: {
    type: String,
    enum: ['payment_method', 'items', 'amount', 'complete_edit', 'deletion'],
    required: true
  },
  changes: {
    before: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      required: false // Allow null for deletion
    }
  },
  reason: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date
  }
});

// Set timestamps with Thailand time
SaleEditHistorySchema.pre('save', function(next) {
  if (this.isNew) {
    this.createdAt = now();
  }
  next();
});

// Indexes
SaleEditHistorySchema.index({ saleId: 1 });
SaleEditHistorySchema.index({ createdAt: -1 });
SaleEditHistorySchema.index({ editedByUserId: 1 });

// Clear existing model to ensure schema updates are applied
if (mongoose.models.SaleEditHistory) {
  delete mongoose.models.SaleEditHistory;
}

export default mongoose.model('SaleEditHistory', SaleEditHistorySchema);