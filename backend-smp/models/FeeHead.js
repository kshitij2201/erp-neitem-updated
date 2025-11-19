import  mongoose from 'mongoose';

const feeHeadSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    applyTo: {
      type: String,
      enum: ["all", "filtered"],
      default: "all",
    },
    filters: {
      stream: { type: mongoose.Schema.Types.ObjectId, ref: "Stream", default: null },
      casteCategory: { type: String, default: null },
    },
    // Collection tracking fields
    totalCollected: { 
      type: Number, 
      default: 0,
      min: 0
    },
    collectionCount: { 
      type: Number, 
      default: 0,
      min: 0
    },
    lastCollectionDate: { 
      type: Date, 
      default: null
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

// Pre-delete middleware to update related FeePayment records
feeHeadSchema.pre('findOneAndDelete', async function(next) {
  try {
    const feeHead = await this.model.findOne(this.getFilter());
    if (feeHead) {
      const FeePayment = mongoose.model('FeePayment');
      const relatedPayments = await FeePayment.find({ feeHeader: feeHead._id });

      // Update each FeePayment record by subtracting the fee head amount from pendingAmount
      for (const payment of relatedPayments) {
        const newPendingAmount = Math.max(0, payment.pendingAmount - feeHead.amount);
        await FeePayment.findByIdAndUpdate(payment._id, {
          pendingAmount: newPendingAmount,
          updatedAt: new Date()
        });
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

export default mongoose.model("FeeHead", feeHeadSchema);
