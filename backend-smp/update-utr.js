import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Import models
import Payment from './models/Payment.js';

const updateExistingPayments = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find payments with digital payment methods that don't have UTR
    const digitalMethods = ['Online', 'Bank Transfer', 'Card', 'UPI'];
    const paymentsToUpdate = await Payment.find({
      paymentMethod: { $in: digitalMethods },
      $or: [
        { utr: { $exists: false } },
        { utr: '' },
        { utr: null }
      ]
    });

    console.log(`📊 Found ${paymentsToUpdate.length} payments that need UTR updates`);

    // For each payment, set UTR to transactionId if available, otherwise to a default value
    for (const payment of paymentsToUpdate) {
      const newUtr = payment.transactionId || `TXN-${payment.paymentId}` || `REF-${payment.receiptNumber}`;

      await Payment.findByIdAndUpdate(payment._id, {
        utr: newUtr
      });

      console.log(`✅ Updated payment ${payment.receiptNumber}: UTR set to ${newUtr}`);
    }

    console.log('🎉 All payments updated successfully!');

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error updating payments:', error);
    process.exit(1);
  }
};

// Run the update
updateExistingPayments();