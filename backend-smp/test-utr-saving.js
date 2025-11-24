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

const testUTRSaving = async () => {
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

    console.log('📝 Testing with student:', student.firstName, student.lastName);

    // Create a test payment with UTR
    const testPayment = new Payment({
      studentId: student._id,
      studentName: `${student.firstName} ${student.lastName}`.trim(),
      amount: 100,
      paymentMethod: 'UPI',
      description: 'Test payment for UTR saving',
      transactionId: 'TEST123',
      utr: 'UTRTEST123456789',
      collectedBy: 'Test User',
      remarks: 'Testing UTR field saving'
    });

    console.log('💾 Saving payment with UTR:', testPayment.utr);

    await testPayment.save();

    console.log('✅ Payment saved successfully!');
    console.log('📄 Receipt Number:', testPayment.receiptNumber);
    console.log('🔢 Payment ID:', testPayment.paymentId);

    // Now fetch the payment back to verify UTR was saved
    const savedPayment = await Payment.findById(testPayment._id);

    console.log('🔍 Retrieved payment from database:');
    console.log('   - Payment Method:', savedPayment.paymentMethod);
    console.log('   - UTR:', savedPayment.utr);
    console.log('   - Transaction ID:', savedPayment.transactionId);
    console.log('   - Amount:', savedPayment.amount);

    if (savedPayment.utr === 'UTRTEST123456789') {
      console.log('✅ SUCCESS: UTR was saved correctly!');
    } else {
      console.log('❌ FAILURE: UTR was not saved correctly!');
      console.log('   Expected: UTRTEST123456789');
      console.log('   Actual:', savedPayment.utr);
    }

    // Test with different payment methods
    const paymentMethods = ['Bank Transfer', 'Card', 'Online'];

    for (const method of paymentMethods) {
      const testPayment2 = new Payment({
        studentId: student._id,
        studentName: `${student.firstName} ${student.lastName}`.trim(),
        amount: 50,
        paymentMethod: method,
        description: `Test ${method} payment`,
        transactionId: `TEST${method.replace(' ', '')}123`,
        utr: `UTR${method.replace(' ', '')}123456789`,
        collectedBy: 'Test User',
        remarks: `Testing ${method} UTR saving`
      });

      await testPayment2.save();

      const savedPayment2 = await Payment.findById(testPayment2._id);

      console.log(`🔍 ${method} payment:`);
      console.log(`   - UTR: ${savedPayment2.utr}`);
      console.log(`   - Saved correctly: ${savedPayment2.utr === `UTR${method.replace(' ', '')}123456789` ? '✅' : '❌'}`);
    }

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error testing UTR saving:', error);
    process.exit(1);
  }
};

// Run the test
testUTRSaving();