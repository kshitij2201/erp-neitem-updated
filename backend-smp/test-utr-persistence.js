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

const testUTRPersistence = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Create a test UPI payment
    const testPayment = new Payment({
      studentId: '507f1f77bcf86cd799439011', // Dummy ID for testing
      studentName: 'Test Student',
      amount: 500,
      paymentMethod: 'UPI',
      description: 'Test UPI Payment',
      transactionId: 'TXN123456',
      utr: 'UTRTEST123456789',
      collectedBy: 'Test User',
      remarks: 'Testing UTR persistence'
    });

    console.log('📝 Creating test payment with UTR:', testPayment.utr);

    await testPayment.save();
    console.log('💾 Payment saved with ID:', testPayment._id);
    console.log('🧾 Receipt Number:', testPayment.receiptNumber);

    // Retrieve the payment to verify UTR was saved
    const retrievedPayment = await Payment.findById(testPayment._id);
    console.log('🔍 Retrieved payment UTR:', retrievedPayment.utr);
    console.log('✅ UTR saved correctly:', retrievedPayment.utr === 'UTRTEST123456789');

    // Find all UPI payments to check existing data
    const upiPayments = await Payment.find({
      paymentMethod: 'UPI'
    }).sort({ createdAt: -1 }).limit(5);

    console.log(`\n📱 Found ${upiPayments.length} recent UPI payments:`);
    upiPayments.forEach((payment, index) => {
      console.log(`${index + 1}. Receipt: ${payment.receiptNumber}, UTR: "${payment.utr}", Has UTR: ${!!payment.utr && payment.utr.trim() !== ''}`);
    });

    // Clean up test payment
    await Payment.findByIdAndDelete(testPayment._id);
    console.log('🗑️ Test payment cleaned up');

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error testing UTR persistence:', error);
    process.exit(1);
  }
};

// Run the test
testUTRPersistence();