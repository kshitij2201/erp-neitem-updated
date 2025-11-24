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
import Student from './models/StudentManagement.js';

const testUTRPayment = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find a test student
    const student = await Student.findOne().limit(1);
    if (!student) {
      console.log('❌ No students found in database');
      return;
    }

    console.log('📝 Testing with student:', student.firstName, student.lastName);

    // Create a test payment with UTR
    const testUTR = 'TEST-UTR-123456789';
    const payment = new Payment({
      studentId: student._id,
      studentName: `${student.firstName} ${student.lastName}`.trim(),
      amount: 100,
      paymentMethod: 'UPI',
      description: 'Test payment for UTR verification',
      transactionId: 'TXN-TEST-001',
      utr: testUTR,
      collectedBy: 'Test User',
      remarks: 'UTR test payment'
    });

    await payment.save();
    console.log('💾 Payment saved with receipt:', payment.receiptNumber);
    console.log('🔍 Saved UTR value:', payment.utr);

    // Verify the payment was saved with UTR
    const savedPayment = await Payment.findById(payment._id);
    console.log('✅ Retrieved payment UTR:', savedPayment.utr);

    if (savedPayment.utr === testUTR) {
      console.log('🎉 SUCCESS: UTR is being saved correctly!');
    } else {
      console.log('❌ FAILURE: UTR not saved properly');
      console.log('Expected:', testUTR);
      console.log('Actual:', savedPayment.utr);
    }

    // Clean up - delete the test payment
    await Payment.findByIdAndDelete(payment._id);
    console.log('🧹 Test payment cleaned up');

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error testing UTR payment:', error);
    process.exit(1);
  }
};

// Run the test
testUTRPayment();