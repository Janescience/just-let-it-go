import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  brandId: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  brandId: {
    type: String,
    ref: 'Brand',
    required: true,
  },
  order: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Index สำหรับ performance
CategorySchema.index({ brandId: 1, order: 1 });
CategorySchema.index({ brandId: 1, isActive: 1 });

export default mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);