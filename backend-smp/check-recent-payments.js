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

const checkRecentPayments = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get recent payments (last 10)
    const recentPayments = await Payment.find()
      .sort({ createdAt: -1 })
      .limit(10);

    console.log(`📊 Found ${recentPayments.length} recent payments\n`);

    recentPayments.forEach((payment, index) => {
      console.log(`--- Payment ${index + 1} ---`);
      console.log(`Receipt: ${payment.receiptNumber}`);
      console.log(`Student: ${payment.studentName || 'Unknown'}`);
      console.log(`Amount: ₹${payment.amount}`);
      console.log(`Method: ${payment.paymentMethod}`);
      console.log(`UTR: "${payment.utr || 'NOT SET'}"`);
      console.log(`Transaction ID: "${payment.transactionId || 'NOT SET'}"`);
      console.log(`Date: ${payment.createdAt}`);
      console.log(`Has UTR: ${!!payment.utr && payment.utr.trim() !== '' ? '✅' : '❌'}`);
      console.log('');
    });

    // Check specifically for digital payment methods
    const digitalPayments = recentPayments.filter(p =>
      ['Online', 'Bank Transfer', 'Card', 'UPI'].includes(p.paymentMethod)
    );

    console.log(`💳 Digital payments found: ${digitalPayments.length}`);

    const digitalWithUTR = digitalPayments.filter(p => p.utr && p.utr.trim() !== '');
    const digitalWithoutUTR = digitalPayments.filter(p => !p.utr || p.utr.trim() === '');

    console.log(`✅ Digital payments WITH UTR: ${digitalWithUTR.length}`);
    console.log(`❌ Digital payments WITHOUT UTR: ${digitalWithoutUTR.length}`);

    if (digitalWithoutUTR.length > 0) {
      console.log('\n❌ Payments missing UTR:');
      digitalWithoutUTR.forEach(p => {
        console.log(`   - ${p.receiptNumber} (${p.paymentMethod})`);
      });
    }

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error checking recent payments:', error);
    process.exit(1);
  }
};

// Run the check
checkRecentPayments();