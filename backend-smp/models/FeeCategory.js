import mongoose from 'mongoose';

const feeCategorySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true
    },
    name: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    category: {
      type: String,
      enum: ["admission", "exam"],
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    description: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

// Compound index to ensure unique key per category
feeCategorySchema.index({ key: 1, category: 1 }, { unique: true });

export default mongoose.model("FeeCategory", feeCategorySchema);