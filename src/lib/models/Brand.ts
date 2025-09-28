import mongoose, { Schema, Document } from 'mongoose';
import { Brand } from '@/types';

interface IBrand extends Omit<Brand, '_id'>, Document {}

const BrandSchema = new Schema<IBrand>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  logo: {
    type: String,
    default: null,
  },
  ownerId: {
    type: String,
    ref: 'User',
    required: true,
  },
  paymentInfo: {
    phone: {
      type: String,
      default: null,
    },
    idCard: {
      type: String,
      default: null,
    },
    eWallet: {
      type: String,
      default: null,
    },
    paotang: {
      type: String,
      default: null,
    },
  },
}, {
  timestamps: true,
});

BrandSchema.index({ ownerId: 1 });

export default mongoose.models.Brand || mongoose.model<IBrand>('Brand', BrandSchema);