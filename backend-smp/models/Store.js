import mongoose from 'mongoose';

// Item Schema for Store Management
const itemSchema = new mongoose.Schema({
  itemId: {
    type: String,
    unique: true,
    trim: true
  },
  itemName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Office Supplies',
      'Cleaning Supplies', 
      'IT Equipment',
      'Furniture',
      'Lab Equipment',
      'Books',
      'Electronics',
      'Maintenance',
      'Safety Equipment',
      'Sports Equipment',
      'Other'
    ]
  },
  subcategory: {
    type: String,
    trim: true
  },
  unit: {
    type: String,
    required: true,
    enum: ['Piece', 'Kilogram', 'Liter', 'Meter', 'Box', 'Pack', 'Set', 'Dozen', 'Ream', 'Carton', 'Other'],
    default: 'Piece'
  },
  currentStock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  minimumStock: {
    type: Number,
    required: true,
    min: 0,
    default: 10
  },
  maximumStock: {
    type: Number,
    required: true,
    min: 1,
    default: 1000
  },
  reorderLevel: {
    type: Number,
    required: true,
    min: 0,
    default: 20
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  location: {
    building: { type: String, trim: true },
    floor: { type: String, trim: true },
    room: { type: String, trim: true },
    rack: { type: String, trim: true },
    shelf: { type: String, trim: true }
  },
  supplier: {
    name: { type: String, trim: true },
    contact: { type: String, trim: true },
    email: { type: String, trim: true },
    address: { type: String, trim: true }
  },
  specifications: {
    type: String,
    trim: true
  },
  brand: {
    type: String,
    trim: true
  },
  model: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued'],
    default: 'active'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: String,
    trim: true
  },
  updatedBy: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Transaction Schema for Store Management
const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    unique: true,
    trim: true
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  transactionType: {
    type: String,
    required: true,
    enum: ['inward', 'outward', 'adjustment', 'return']
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  totalValue: {
    type: Number,
    min: 0
  },
  previousStock: {
    type: Number,
    required: true,
    min: 0
  },
  newStock: {
    type: Number,
    required: true,
    min: 0
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  reason: {
    type: String,
    trim: true
  },
  remarks: {
    type: String,
    trim: true
  },
  invoiceDetails: {
    invoiceNumber: { type: String, trim: true },
    invoiceDate: { type: Date },
    supplierName: { type: String, trim: true }
  },
  transactionDate: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['completed', 'pending', 'cancelled'],
    default: 'completed'
  }
}, {
  timestamps: true
});

// Request Schema for Store Management
const requestSchema = new mongoose.Schema({
  requestId: {
    type: String,
    unique: true,
    trim: true
  },
  requestedBy: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  items: [{
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true
    },
    requestedQuantity: {
      type: Number,
      required: true,
      min: 1
    },
    approvedQuantity: {
      type: Number,
      min: 0,
      default: 0
    },
    remarks: {
      type: String,
      trim: true
    }
  }],
  requestDate: {
    type: Date,
    default: Date.now
  },
  requiredDate: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'partially_approved', 'rejected', 'fulfilled'],
    default: 'pending'
  },
  approvedBy: {
    type: String,
    trim: true
  },
  approvalDate: {
    type: Date
  },
  approvalRemarks: {
    type: String,
    trim: true
  },
  fulfilledDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Pre-save middleware to auto-generate IDs
itemSchema.pre('save', async function(next) {
  if (!this.itemId) {
    const count = await this.constructor.countDocuments();
    this.itemId = `ITM${String(count + 1).padStart(4, '0')}`;
  }
  this.lastUpdated = new Date();
  next();
});

transactionSchema.pre('save', async function(next) {
  if (!this.transactionId) {
    const count = await this.constructor.countDocuments();
    this.transactionId = `TXN${String(count + 1).padStart(6, '0')}`;
  }
  this.totalValue = this.quantity * this.unitPrice;
  next();
});

requestSchema.pre('save', async function(next) {
  if (!this.requestId) {
    const count = await this.constructor.countDocuments();
    this.requestId = `REQ${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Indexes for better performance
itemSchema.index({ category: 1 });
itemSchema.index({ status: 1 });
itemSchema.index({ currentStock: 1 });

transactionSchema.index({ itemId: 1 });
transactionSchema.index({ transactionType: 1 });
transactionSchema.index({ transactionDate: -1 });

requestSchema.index({ requestedBy: 1 });
requestSchema.index({ status: 1 });
requestSchema.index({ requestDate: -1 });

// Export models
export const Item = mongoose.model('Item', itemSchema);
export const Transaction = mongoose.model('Transaction', transactionSchema);
export const Request = mongoose.model('Request', requestSchema);
