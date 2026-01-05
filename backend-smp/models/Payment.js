import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    unique: true,
    sparse: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  isExtraStudent: {
    type: Boolean,
    default: false
  },
  studentName: {
    type: String,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Online', 'Cheque', 'Bank Transfer', 'UPI', 'Card'],
    required: true
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  receiptNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  feeHead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FeeHead'
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed', 'Refunded'],
    default: 'Completed'
  },
  transactionId: {
    type: String,
    trim: true
  },
  utr: {
    type: String,
    default: '',
    set: function(value) {
      // Handle undefined, null, or 'undefined' string
      if (!value || value === 'undefined' || value === 'null') {
        return '';
      }
      return String(value).trim();
    }
  },
  remarks: {
    type: String,
    trim: true
  },
  collectedBy: {
    type: String,
    trim: true
  },
  semester: {
    type: Number,
    default: null
  },
  // New fields for admission and exam fees
  admissionType: {
    type: String,
    enum: ['Fresh Admission', 'Re-admission', 'Lateral Entry', 'Transfer'],
    trim: true
  },
  admissionCategory: {
    type: String,
    enum: ['General', 'SC/ST', 'OBC', 'Management', 'NRI'],
    trim: true
  },
  examType: {
    type: String,
    enum: ['Regular', 'Supplementary', 'Revaluation', 'Improvement'],
    trim: true
  },
  examSemester: {
    type: Number,
    min: 1,
    max: 8
  },
  examSubjectCount: {
    type: Number,
    min: 1,
    max: 20
  },
  selectedFeeCategories: [{
    id: String,
    name: String,
    amount: Number
  }],
  multipleFees: [{
    feeHead: String,
    currentPayment: Number
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add schema transformation to ensure populated data is returned
paymentSchema.methods.toJSON = function() {
  const payment = this.toObject();
  
  // Ensure student data is properly formatted
  if (payment.studentId && typeof payment.studentId === 'object' && payment.studentId._id) {
    payment.student = {
      id: payment.studentId._id,
      studentId: payment.studentId.studentId,
      name: `${payment.studentId.firstName || ''} ${payment.studentId.lastName || ''}`.trim(),
      firstName: payment.studentId.firstName,
      lastName: payment.studentId.lastName,
      department: payment.studentId.department,
      casteCategory: payment.studentId.casteCategory
    };
  }
  
  // Ensure fee head data is properly formatted
  if (payment.feeHead && typeof payment.feeHead === 'object' && payment.feeHead._id) {
    payment.feeHeadDetails = {
      id: payment.feeHead._id,
      title: payment.feeHead.title,
      amount: payment.feeHead.amount,
      description: payment.feeHead.description,
      applyTo: payment.feeHead.applyTo,
      filters: payment.feeHead.filters,
      collectionStats: {
        totalCollected: payment.feeHead.totalCollected || 0,
        collectionCount: payment.feeHead.collectionCount || 0,
        lastCollectionDate: payment.feeHead.lastCollectionDate
      }
    };
  }
  
  return payment;
};

// Auto-generate receipt number and payment ID before saving
paymentSchema.pre('save', async function(next) {
  try {
    // Generate payment ID if not exists
    if (!this.paymentId) {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
      this.paymentId = `PAY${year}${month}${day}${hours}${minutes}${random}`;
    }

    // Generate simplified receipt number if not exists
    if (!this.receiptNumber) {
      const date = new Date();
      const year = String(date.getFullYear()).slice(-2); // Last 2 digits of year
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const random = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
      this.receiptNumber = `NIETM${year}${month}${day}${random}`;
    }

    this.updatedAt = Date.now();
    next();
  } catch (error) {
    next(error);
  }
});

export default mongoose.model('Payment', paymentSchema); 
