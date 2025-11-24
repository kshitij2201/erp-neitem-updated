import mongoose from 'mongoose';

const deletedReceiptSchema = new mongoose.Schema({
  deletedReceiptId: {
    type: String,
    required: true
  },
  receiptNumber: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['student', 'salary'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  recipientName: {
    type: String,
    default: ''
  },
  studentId: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  paymentMethod: {
    type: String,
    default: ''
  },
  utr: {
    type: String,
    default: ''
  },
  paymentDate: {
    type: Date,
    default: null
  },
  deletedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  deletedBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

const DeletedReceipt = mongoose.model('DeletedReceipt', deletedReceiptSchema);

export default DeletedReceipt;
