import mongoose from 'mongoose';

const examFeeSchema = new mongoose.Schema({
  stream: { type: String, required: true },
  branch: { type: String, required: true },
  semester: { type: String, required: true },
  head: { type: String, required: true },
  amount: { type: Number, required: true }
});

// Compound index for uniqueness
// examFeeSchema.index({ stream: 1, branch: 1, semester: 1, head: 1 }, { unique: true });

export default mongoose.model('ExamFee', examFeeSchema);