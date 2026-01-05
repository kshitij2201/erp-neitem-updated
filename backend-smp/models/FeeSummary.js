import mongoose from "mongoose";

const feeSummarySchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
    unique: true
  },
  studentName: {
    type: String,
    required: true
  },
  casteCategory: {
    type: String,
    required: true
  },
  stream: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  totalFees: {
    type: Number,
    default: 0,
    required: true
  },
  paidFees: {
    type: Number,
    default: 0,
    required: true
  },
  pendingFees: {
    type: Number,
    default: 0,
    required: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for faster queries
feeSummarySchema.index({ department: 1, stream: 1 });
feeSummarySchema.index({ casteCategory: 1 });

export default mongoose.model("FeeSummary", feeSummarySchema);