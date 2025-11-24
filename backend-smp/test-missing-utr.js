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

const testMissingUTR = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get a test student
    const student = await Student.findOne().limit(1);
    if (!student) {
      console.log('❌ No students found in database');
      return;
    }

    console.log('📝 Testing missing UTR for student:', student.firstName, student.lastName);

    // Simulate frontend data WITHOUT UTR (user didn't fill it)
    const frontendDataWithoutUTR = {
      studentId: student._id.toString(),
      amount: "500",
      paymentMethod: "UPI",
      feeHead: "",
      description: "Test payment without UTR",
      transactionId: "TXN-TEST-002",
      utr: "", // Empty UTR - user didn't fill it
      collectedBy: "Test User",
      remarks: "Testing missing UTR"
    };

    console.log('📤 Frontend data WITHOUT UTR:');
    console.log(JSON.stringify(frontendDataWithoutUTR, null, 2));

    // Process same as backend
    const {
      studentId,
      amount,
      paymentMethod,
      feeHead,
      description,
      transactionId,
      collectedBy,
      remarks,
      utr
    } = frontendDataWithoutUTR;

    console.log('🔄 Backend processing:');
    console.log('   - utr value:', `"${utr}"`);
    console.log('   - utr truthy check:', !!utr);
    console.log('   - utr after || "":', utr || '');

    // Check if student exists
    const studentDoc = await Student.findById(studentId);
    if (!studentDoc) {
      console.log('❌ Student not found');
      return;
    }

    // Create payment (same as backend)
    const payment = new Payment({
      studentId,
      studentName: `${studentDoc.firstName} ${studentDoc.lastName}`.trim(),
      amount: parseFloat(amount),
      paymentMethod,
      feeHead: feeHead && feeHead !== '' ? feeHead : undefined,
      description: description || '',
      transactionId: transactionId || '',
      utr: utr || '', // This will be empty string
      collectedBy: collectedBy || '',
      remarks: remarks || ''
    });

    await payment.save();

    console.log('✅ Payment saved successfully!');
    console.log('📄 Receipt Number:', payment.receiptNumber);

    // Verify what was saved
    const savedPayment = await Payment.findById(payment._id);

    console.log('🔍 Verification - saved payment:');
    console.log('   - paymentMethod:', savedPayment.paymentMethod);
    console.log('   - utr:', `"${savedPayment.utr}"`);
    console.log('   - utr length:', savedPayment.utr.length);
    console.log('   - has utr:', !!savedPayment.utr && savedPayment.utr.trim() !== '');

    if (!savedPayment.utr || savedPayment.utr.trim() === '') {
      console.log('⚠️  WARNING: Payment saved WITHOUT UTR for digital payment method!');
      console.log('   This is the issue - empty UTR is being saved for UPI payments');
    }

    // Clean up
    await Payment.findByIdAndDelete(payment._id);
    console.log('🧹 Test payment cleaned up');

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error testing missing UTR:', error);
    process.exit(1);
  }
};

// Run the test
testMissingUTR();