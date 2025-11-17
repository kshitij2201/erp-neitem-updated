import mongoose from 'mongoose';

const feeHeaderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  stream: { type: mongoose.Schema.Types.ObjectId, ref: 'Stream', required: true },
  createdAt: { type: Date, default: Date.now },
});

// Unique index on name and stream combination
feeHeaderSchema.index({ name: 1, stream: 1 }, { unique: true });

// Pre-delete middleware to update related FeePayment records
feeHeaderSchema.pre('findOneAndDelete', async function(next) {
  try {
    const feeHeader = await this.model.findOne(this.getFilter());
    if (feeHeader) {
      const FeePayment = mongoose.model('FeePayment');
      const relatedPayments = await FeePayment.find({ feeHeader: feeHeader._id });

      // Update each FeePayment record by subtracting the fee header amount from pendingAmount
      for (const payment of relatedPayments) {
        const newPendingAmount = Math.max(0, payment.pendingAmount - feeHeader.amount);
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

const FeeHeader = mongoose.model('FeeHeader', feeHeaderSchema);

export default FeeHeader;
