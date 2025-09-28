import mongoose, { Schema, Document } from 'mongoose';
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
}, {
  timestamps: true,
});

IngredientSchema.index({ brandId: 1 });
IngredientSchema.index({ brandId: 1, name: 1 });

export default mongoose.models.Ingredient || mongoose.model<IIngredient>('Ingredient', IngredientSchema);