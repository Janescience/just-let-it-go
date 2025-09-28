import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '@/types';

interface IUser extends Omit<User, '_id'>, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 20,
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  role: {
    type: String,
    enum: ['admin', 'staff'],
    required: true,
    default: 'admin',
  },
  brandId: {
    type: String,
    ref: 'Brand',
    required: true,
  },
  boothId: {
    type: String,
    ref: 'Booth',
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Indexes
UserSchema.index({ username: 1, brandId: 1 }, { unique: true }); // Username unique per brand
UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ brandId: 1 });
UserSchema.index({ boothId: 1 });
UserSchema.index({ brandId: 1, role: 1 });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);