import mongoose, { Schema, Document } from 'mongoose';
import { QRPayment } from '@/types';

interface IQRPayment extends Omit<QRPayment, '_id'>, Document {}

const QRPaymentSchema = new Schema<IQRPayment>({
  saleId: {
    type: Schema.Types.ObjectId,
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
}, {
  timestamps: true,
});

QRPaymentSchema.index({ saleId: 1 });
QRPaymentSchema.index({ status: 1 });
QRPaymentSchema.index({ expiresAt: 1 });

export default mongoose.models.QRPayment || mongoose.model<IQRPayment>('QRPayment', QRPaymentSchema);