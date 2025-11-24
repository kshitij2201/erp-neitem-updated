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

const cleanUndefinedUTR = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find payments with "undefined" UTR
    const paymentsWithUndefinedUTR = await Payment.find({
      $or: [
        { utr: 'undefined' },
        { utr: 'null' },
        { utr: null },
        { utr: { $exists: false } }
      ]
    });

    console.log(`🔍 Found ${paymentsWithUndefinedUTR.length} payments with problematic UTR values:`);

    if (paymentsWithUndefinedUTR.length === 0) {
      console.log('✅ No payments found with problematic UTR values!');
      await mongoose.disconnect();
      return;
    }

    // Show details before cleaning
    paymentsWithUndefinedUTR.forEach((payment, index) => {
      console.log(`  ${index + 1}. ${payment.receiptNumber} - ${payment.paymentMethod} - UTR: "${payment.utr}"`);
    });

    console.log('\n🧹 Cleaning undefined UTR values...');

    // Update all problematic UTR values to empty string
    const updateResult = await Payment.updateMany(
      {
        $or: [
          { utr: 'undefined' },
          { utr: 'null' },
          { utr: null },
          { utr: { $exists: false } }
        ]
      },
      {
        $set: { utr: '' }
      }
    );

    console.log(`✅ Updated ${updateResult.modifiedCount} payment records`);

    // Verify the cleanup
    const verifyPayments = await Payment.find({
      _id: { $in: paymentsWithUndefinedUTR.map(p => p._id) }
    });

    console.log('\n🔍 Verification after cleanup:');
    verifyPayments.forEach((payment, index) => {
      console.log(`  ${index + 1}. ${payment.receiptNumber} - UTR: "${payment.utr}" ✅`);
    });

    // Check if any payments still have problematic UTR
    const stillProblematic = await Payment.find({
      $or: [
        { utr: 'undefined' },
        { utr: 'null' },
        { utr: null }
      ]
    });

    if (stillProblematic.length === 0) {
      console.log('🎉 SUCCESS: All problematic UTR values have been cleaned!');
    } else {
      console.log(`⚠️ WARNING: ${stillProblematic.length} payments still have problematic UTR values`);
    }

    await mongoose.disconnect();
    console.log('✅ UTR cleanup completed');

  } catch (error) {
    console.error('❌ Error cleaning undefined UTR:', error);
    process.exit(1);
  }
};

cleanUndefinedUTR();