import mongoose, { Schema, Document } from 'mongoose';
import { MenuItem } from '@/types';

interface IMenuItem extends Omit<MenuItem, '_id'>, Document {}

const MenuItemSchema = new Schema<IMenuItem>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  description: {
    type: String,
    trim: true,
  },
  image: {
    type: String,
  },
  ingredients: [{
    ingredientId: {
      type: String,
      ref: 'Ingredient',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
  }],
  brandId: {
    type: String,
    ref: 'Brand',
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

MenuItemSchema.index({ brandId: 1 });
MenuItemSchema.index({ brandId: 1, isActive: 1 });

export default mongoose.models.MenuItem || mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);