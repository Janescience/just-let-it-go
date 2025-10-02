import mongoose from 'mongoose';

const AccountingTransactionSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true
  },
  category: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'transfer', 'mixed', 'other'],
    default: 'other'
  },
  boothId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booth',
    default: null
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  relatedType: {
    type: String,
    enum: ['sale', 'booth_setup', 'stock_purchase', 'manual'],
    default: 'manual'
  },
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
AccountingTransactionSchema.index({ brandId: 1 });
AccountingTransactionSchema.index({ brandId: 1, date: -1 });
AccountingTransactionSchema.index({ brandId: 1, type: 1 });
AccountingTransactionSchema.index({ brandId: 1, category: 1 });
AccountingTransactionSchema.index({ boothId: 1 });
AccountingTransactionSchema.index({ relatedId: 1, relatedType: 1 });

export default mongoose.models.AccountingTransaction ||
  mongoose.model('AccountingTransaction', AccountingTransactionSchema);