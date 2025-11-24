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

const checkUPIPayments = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find UPI payments
    const upiPayments = await Payment.find({
      paymentMethod: 'UPI'
    }).sort({ createdAt: -1 }).limit(10);

    console.log(`📱 Found ${upiPayments.length} UPI payments`);

    upiPayments.forEach((payment, index) => {
      console.log(`\n--- UPI Payment ${index + 1} ---`);
      console.log(`Receipt: ${payment.receiptNumber}`);
      console.log(`Amount: ₹${payment.amount}`);
      console.log(`UTR: "${payment.utr}"`);
      console.log(`Transaction ID: "${payment.transactionId}"`);
      console.log(`Date: ${payment.createdAt}`);
      console.log(`Has UTR: ${!!payment.utr && payment.utr.trim() !== ''}`);
    });

    // Check if any UPI payments are missing UTR
    const upiWithoutUTR = upiPayments.filter(p => !p.utr || p.utr.trim() === '');
    console.log(`\n⚠️ UPI payments without UTR: ${upiWithoutUTR.length}`);

    if (upiWithoutUTR.length > 0) {
      console.log('Receipt numbers without UTR:');
      upiWithoutUTR.forEach(p => console.log(`- ${p.receiptNumber}`));
    }

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error checking UPI payments:', error);
    process.exit(1);
  }
};

// Run the check
checkUPIPayments();