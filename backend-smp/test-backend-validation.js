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

const testBackendValidation = async () => {
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

    console.log('📝 Testing backend validation for student:', student.firstName, student.lastName);

    // Test 1: Try to create UPI payment without UTR (should fail)
    console.log('\n🧪 Test 1: UPI payment without UTR (should fail)');

    const payment1 = new Payment({
      studentId: student._id,
      studentName: `${student.firstName} ${student.lastName}`.trim(),
      amount: 100,
      paymentMethod: 'UPI',
      description: 'Test UPI without UTR',
      transactionId: 'TXN-TEST-001',
      utr: '', // Empty UTR
      collectedBy: 'Test User'
    });

    try {
      await payment1.save();
      console.log('❌ UNEXPECTED: Payment saved without UTR validation!');
      await Payment.findByIdAndDelete(payment1._id); // Clean up
    } catch (error) {
      console.log('✅ EXPECTED: Payment rejected due to missing UTR');
      console.log('   Error:', error.message);
    }

    // Test 2: Create UPI payment with UTR (should succeed)
    console.log('\n🧪 Test 2: UPI payment with UTR (should succeed)');

    const payment2 = new Payment({
      studentId: student._id,
      studentName: `${student.firstName} ${student.lastName}`.trim(),
      amount: 200,
      paymentMethod: 'UPI',
      description: 'Test UPI with UTR',
      transactionId: 'TXN-TEST-002',
      utr: 'VALID-UTR-123456789',
      collectedBy: 'Test User'
    });

    try {
      await payment2.save();
      console.log('✅ SUCCESS: Payment saved with valid UTR');
      console.log('   Receipt:', payment2.receiptNumber);
      console.log('   UTR:', payment2.utr);

      // Clean up
      await Payment.findByIdAndDelete(payment2._id);
      console.log('🧹 Test payment cleaned up');
    } catch (error) {
      console.log('❌ UNEXPECTED: Valid payment rejected');
      console.log('   Error:', error.message);
    }

    // Test 3: Cash payment without UTR (should succeed - UTR not required)
    console.log('\n🧪 Test 3: Cash payment without UTR (should succeed)');

    const payment3 = new Payment({
      studentId: student._id,
      studentName: `${student.firstName} ${student.lastName}`.trim(),
      amount: 50,
      paymentMethod: 'Cash',
      description: 'Test Cash payment',
      collectedBy: 'Test User'
    });

    try {
      await payment3.save();
      console.log('✅ SUCCESS: Cash payment saved without UTR (as expected)');
      console.log('   Receipt:', payment3.receiptNumber);
      console.log('   UTR:', `"${payment3.utr}"`);

      // Clean up
      await Payment.findByIdAndDelete(payment3._id);
      console.log('🧹 Test payment cleaned up');
    } catch (error) {
      console.log('❌ UNEXPECTED: Cash payment rejected');
      console.log('   Error:', error.message);
    }

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('\n✅ All backend validation tests completed');

  } catch (error) {
    console.error('❌ Error testing backend validation:', error);
    process.exit(1);
  }
};

// Run the test
testBackendValidation();