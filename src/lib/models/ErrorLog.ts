import mongoose, { Schema, Document } from 'mongoose';
import { now } from '@/utils/timezone';

export interface IErrorLog extends Document {
  level: 'error' | 'warning' | 'info' | 'debug';
  message: string;
  errorCode?: string;
  stack?: string;
  context: {
    module: string; // e.g., 'sales', 'accounting', 'inventory'
    function: string; // e.g., 'createSale', 'processPayment'
    userId?: string;
    brandId?: string;
    boothId?: string;
    saleId?: string;
    transactionId?: string;
    additionalData?: any;
  };
  userAgent?: string;
  ipAddress?: string;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ErrorLogSchema = new Schema<IErrorLog>({
  level: {
    type: String,
    enum: ['error', 'warning', 'info', 'debug'],
    required: true,
    default: 'error'
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  errorCode: {
    type: String,
    trim: true,
    index: true
  },
  stack: {
    type: String,
    trim: true
  },
  context: {
    module: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    function: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    userId: {
      type: String,
      trim: true,
      index: true
    },
    brandId: {
      type: String,
      trim: true,
      index: true
    },
    boothId: {
      type: String,
      trim: true,
      index: true
    },
    saleId: {
      type: String,
      trim: true,
      index: true
    },
    transactionId: {
      type: String,
      trim: true,
      index: true
    },
    additionalData: {
      type: Schema.Types.Mixed
    }
  },
  userAgent: {
    type: String,
    trim: true
  },
  ipAddress: {
    type: String,
    trim: true
  },
  resolved: {
    type: Boolean,
    default: false,
    index: true
  },
  resolvedAt: {
    type: Date
  },
  resolvedBy: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
  },
  updatedAt: {
    type: Date,
  },
});

// Set timestamps with Thailand time
ErrorLogSchema.pre('save', function(next) {
  const currentTime = now();

  if (this.isNew) {
    this.createdAt = currentTime;
  }
  this.updatedAt = currentTime;

  next();
});

// Indexes for efficient querying
ErrorLogSchema.index({ createdAt: -1 });
ErrorLogSchema.index({ level: 1, createdAt: -1 });
ErrorLogSchema.index({ 'context.module': 1, createdAt: -1 });
ErrorLogSchema.index({ 'context.brandId': 1, createdAt: -1 });
ErrorLogSchema.index({ resolved: 1, createdAt: -1 });

// Compound indexes for common queries
ErrorLogSchema.index({
  'context.brandId': 1,
  level: 1,
  resolved: 1,
  createdAt: -1
});

// Clean up old logs (keep for 90 days)
ErrorLogSchema.index({ createdAt: 1 }, {
  expireAfterSeconds: 90 * 24 * 60 * 60 // 90 days
});

export default mongoose.models.ErrorLog || mongoose.model<IErrorLog>('ErrorLog', ErrorLogSchema);