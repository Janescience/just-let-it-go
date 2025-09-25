import mongoose from 'mongoose';

const EquipmentSetSchema = new mongoose.Schema({
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EquipmentTemplate',
    required: true
  },
  setName: {
    type: String,
    required: true
  },
  purchaseDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'in_use', 'maintenance', 'broken'],
    default: 'available'
  },
  currentBoothId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booth',
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
EquipmentSetSchema.index({ brandId: 1 });
EquipmentSetSchema.index({ brandId: 1, status: 1 });
EquipmentSetSchema.index({ templateId: 1 });
EquipmentSetSchema.index({ currentBoothId: 1 });

// Validate that equipment set can only be in_use if currentBoothId is provided
EquipmentSetSchema.pre('save', function(next) {
  if (this.status === 'in_use' && !this.currentBoothId) {
    next(new Error('currentBoothId is required when status is in_use'));
  } else if (this.status !== 'in_use') {
    this.currentBoothId = null;
  }
  next();
});

export default mongoose.models.EquipmentSet ||
  mongoose.model('EquipmentSet', EquipmentSetSchema);