import mongoose, { Schema, Document } from 'mongoose';
import { Sale } from '@/types';
import { now } from '@/utils/timezone';

interface ISale extends Omit<Sale, '_id'>, Document {}

const SaleSchema = new Schema<ISale>({
  boothId: {
    type: String,
    ref: 'Booth',
    required: true,
  },
  items: [{
    menuItemId: {
      type: String,
      ref: 'MenuItem',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
  }],
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'transfer'],
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending',
  },
  clientTransactionId: {
    type: String,
    unique: true,
    sparse: true,
  },
  qrCodeId: {
    type: String,
    ref: 'QRPayment',
  },
  employeeId: {
    type: String,
    ref: 'User',
  },
  createdAt: {
    type: Date,
  },
  updatedAt: {
    type: Date,
  },
});

// Set timestamps with Thailand time
SaleSchema.pre('save', function(next) {
  const currentTime = now();

  if (this.isNew) {
    this.createdAt = currentTime;
  }
  this.updatedAt = currentTime;

  next();
});

SaleSchema.index({ boothId: 1 });
SaleSchema.index({ boothId: 1, createdAt: -1 });
SaleSchema.index({ paymentStatus: 1 });

export default mongoose.models.Sale || mongoose.model<ISale>('Sale', SaleSchema);