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

const EquipmentUsageHistorySchema = new mongoose.Schema({
  boothId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booth',
    required: true
  },
  boothName: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  daysUsed: {
    type: Number,
    required: true,
    min: 1
  },
  depreciationAmount: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: true
});

const EquipmentSchema = new mongoose.Schema({
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  },
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
  purchaseDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'in_use', 'maintenance', 'broken'],
    default: 'available'
  },
  // Depreciation tracking
  totalDaysUsed: {
    type: Number,
    default: 0,
    min: 0
  },
  currentValue: {
    type: Number,
    required: true,
    min: 0
  },
  depreciationPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // Usage history
  usageHistory: [EquipmentUsageHistorySchema],
  // Current booth if in use
  currentBoothId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booth',
    default: null
  },
  currentBoothName: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Calculate depreciation percentage
EquipmentSchema.methods.calculateDepreciation = function() {
  const depreciationPercentage = Math.min((this.totalDaysUsed / this.estimatedLifespanDays) * 100, 100);
  const currentValue = Math.max(this.totalPrice * (1 - depreciationPercentage / 100), 0);

  this.depreciationPercentage = depreciationPercentage;
  this.currentValue = currentValue;
  return { depreciationPercentage, currentValue };
};

// Add usage record
EquipmentSchema.methods.addUsage = function(boothId: string, boothName: string, startDate: Date, endDate: Date) {
  const daysUsed = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const depreciationAmount = this.dailyCost * daysUsed;

  this.usageHistory.push({
    boothId,
    boothName,
    startDate,
    endDate,
    daysUsed,
    depreciationAmount
  });

  this.totalDaysUsed += daysUsed;
  this.calculateDepreciation();
};

// Set equipment as in use
EquipmentSchema.methods.setInUse = function(boothId: string, boothName: string) {
  this.status = 'in_use';
  this.currentBoothId = boothId;
  this.currentBoothName = boothName;
};

// Set equipment as available and record usage
EquipmentSchema.methods.setAvailable = function(endDate: Date) {
  if (this.status === 'in_use' && this.currentBoothId) {
    // Find the current usage start date (latest usage without end date)
    const currentUsage = this.usageHistory.find(usage => !usage.endDate);
    if (currentUsage) {
      this.addUsage(this.currentBoothId, this.currentBoothName, currentUsage.startDate, endDate);
    }
  }

  this.status = 'available';
  this.currentBoothId = null;
  this.currentBoothName = '';
};

const Equipment = mongoose.models.Equipment || mongoose.model('Equipment', EquipmentSchema);

export default Equipment;