import mongoose, { Schema, Document } from 'mongoose';
import { Booth } from '@/types';

interface IBooth extends Omit<Booth, '_id'>, Document {}

const BoothSchema = new Schema<IBooth>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  rentCost: {
    type: Number,
    required: true,
    min: 0,
  },
  openingHours: {
    start: {
      type: String,
      required: true,
    },
    end: {
      type: String,
      required: true,
    },
  },
  staff: {
    username: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  employees: [{
    name: {
      type: String,
      required: true,
      trim: true,
    },
    salary: {
      type: Number,
      required: true,
      min: 0,
    },
    position: {
      type: String,
      trim: true,
    },
  }],
  menuItems: [{
    type: Schema.Types.ObjectId,
    ref: 'MenuItem',
  }],
  boothStock: [{
    ingredientId: {
      type: Schema.Types.ObjectId,
      ref: 'Ingredient',
      required: true,
    },
    allocatedQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    usedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingQuantity: {
      type: Number,
      default: function(this: any) {
        return this.allocatedQuantity - this.usedQuantity;
      },
      min: 0,
    },
  }],
  brandId: {
    type: Schema.Types.ObjectId,
    ref: 'Brand',
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  totalCost: {
    type: Number,
    default: 0,
  },
  businessPlan: {
    fixedCosts: {
      rent: Number,
      staff: Number,
      total: Number,
    },
    breakEven: {
      unitsNeeded: Number,
      revenueNeeded: Number,
      dailyTarget: Number,
    },
    ingredients: [{
      name: String,
      quantity: Number,
      unit: String,
      cost: Number,
    }],
    totalCapital: Number,
    targetProfit: {
      type: {
        type: String,
        enum: ['percentage', 'amount']
      },
      value: Number,
      unitsNeeded: Number,
      revenueNeeded: Number,
      additionalIngredients: Number,
      totalCapitalWithProfit: Number,
    },
  },
}, {
  timestamps: true,
});

BoothSchema.index({ brandId: 1 });
BoothSchema.index({ brandId: 1, isActive: 1 });
BoothSchema.index({ startDate: 1, endDate: 1 });

export default mongoose.models.Booth || mongoose.model<IBooth>('Booth', BoothSchema);