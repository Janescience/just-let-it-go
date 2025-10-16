import mongoose, { Schema, Document } from 'mongoose';
import { now } from '@/utils/timezone';
import { Ingredient } from '@/types';

interface IIngredient extends Omit<Ingredient, '_id'>, Document {}

const IngredientSchema = new Schema<IIngredient>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  unit: {
    type: String,
    required: true,
    trim: true,
  },
  costPerUnit: {
    type: Number,
    required: true,
    min: 0,
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  minimumStock: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  brandId: {
    type: String,
    ref: 'Brand',
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
IngredientSchema.pre('save', function(next) {
  const currentTime = now();

  if (this.isNew) {
    this.createdAt = currentTime;
  }
  this.updatedAt = currentTime;

  next();
});

IngredientSchema.index({ brandId: 1 });
IngredientSchema.index({ brandId: 1, name: 1 });

export default mongoose.models.Ingredient || mongoose.model<IIngredient>('Ingredient', IngredientSchema);