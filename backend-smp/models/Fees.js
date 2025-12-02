import mongoose from 'mongoose';

const feesSchema = new mongoose.Schema(
  {
    stream: { type: String, required: true },
    branch: { type: String, required: true },
    batch: { type: String, required: true },
    head: { type: String, required: true },
    amount: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

// Compound index to ensure unique combination
feesSchema.index({ stream: 1, branch: 1, batch: 1, head: 1 }, { unique: true });

export default mongoose.model("Fees", feesSchema);