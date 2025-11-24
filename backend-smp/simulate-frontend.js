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

const simulateFrontendRequest = async () => {
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

    console.log('📝 Simulating frontend request for student:', student.firstName, student.lastName);

    // Simulate the exact data that frontend sends
    const frontendData = {
      studentId: student._id.toString(),
      amount: "300",
      paymentMethod: "UPI",
      feeHead: "",
      description: "",
      transactionId: "",
      utr: "FRONTEND-UTR-123456789",
      collectedBy: "",
      remarks: ""
    };

    console.log('📤 Frontend data being sent:');
    console.log(JSON.stringify(frontendData, null, 2));

    // Simulate backend processing (same as in routes/payments.js)
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
    } = frontendData;

    console.log('🔄 Backend extracted values:');
    console.log('   - studentId:', studentId);
    console.log('   - amount:', amount);
    console.log('   - paymentMethod:', paymentMethod);
    console.log('   - utr:', utr);

    // Check if student exists
    const studentDoc = await Student.findById(studentId);
    if (!studentDoc) {
      console.log('❌ Student not found');
      return;
    }

    // Create payment object (same as in backend)
    const payment = new Payment({
      studentId,
      studentName: `${studentDoc.firstName} ${studentDoc.lastName}`.trim(),
      amount: parseFloat(amount),
      paymentMethod,
      feeHead: feeHead && feeHead !== '' ? feeHead : undefined,
      description: description || '',
      transactionId: transactionId || '',
      utr: utr || '',
      collectedBy: collectedBy || '',
      remarks: remarks || ''
    });

    console.log('💾 Payment object before save:');
    console.log('   - utr:', payment.utr);
    console.log('   - paymentMethod:', payment.paymentMethod);

    await payment.save();

    console.log('✅ Payment saved successfully!');
    console.log('📄 Receipt Number:', payment.receiptNumber);

    // Verify what was saved
    const savedPayment = await Payment.findById(payment._id);

    console.log('🔍 Verification - saved payment:');
    console.log('   - paymentMethod:', savedPayment.paymentMethod);
    console.log('   - utr:', savedPayment.utr);
    console.log('   - transactionId:', savedPayment.transactionId);

    if (savedPayment.utr === frontendData.utr) {
      console.log('✅ SUCCESS: UTR saved correctly from frontend simulation!');
    } else {
      console.log('❌ FAILURE: UTR not saved correctly!');
      console.log('   Expected:', frontendData.utr);
      console.log('   Actual:', savedPayment.utr);
    }

    // Clean up
    await Payment.findByIdAndDelete(payment._id);
    console.log('🧹 Test payment cleaned up');

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error simulating frontend request:', error);
    process.exit(1);
  }
};

// Run the simulation
simulateFrontendRequest();