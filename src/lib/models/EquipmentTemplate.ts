import mongoose from 'mongoose';

const EquipmentItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    default: ''
  }
});

const EquipmentTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  items: [EquipmentItemSchema],
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  estimatedLifespanDays: {
    type: Number,
    required: true,
    min: 1
  },
  dailyCost: {
    type: Number,
    required: true,
    min: 0
  },
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  }
}, {
  timestamps: true
});

// Index for better query performance
EquipmentTemplateSchema.index({ brandId: 1 });
EquipmentTemplateSchema.index({ brandId: 1, name: 1 });

export default mongoose.models.EquipmentTemplate ||
  mongoose.model('EquipmentTemplate', EquipmentTemplateSchema);