import mongoose, { Schema, Document } from 'mongoose';
import { QRPayment } from '@/types';
import { now } from '@/utils/timezone';

interface IQRPayment extends Omit<QRPayment, '_id'>, Document {}

const QRPaymentSchema = new Schema<IQRPayment>({
  saleId: {
    type: String,
    ref: 'Sale',
    required: true,
  },
  qrCode: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'expired'],
    default: 'pending',
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
  },
  updatedAt: {
    type: Date,
  },
});

// Set timestamps with Thailand time
QRPaymentSchema.pre('save', function(next) {
  const currentTime = now();

  if (this.isNew) {
    this.createdAt = currentTime;
  }
  this.updatedAt = currentTime;

  next();
});

QRPaymentSchema.index({ saleId: 1 });
QRPaymentSchema.index({ status: 1 });
QRPaymentSchema.index({ expiresAt: 1 });

export default mongoose.models.QRPayment || mongoose.model<IQRPayment>('QRPayment', QRPaymentSchema);