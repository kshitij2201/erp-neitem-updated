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

const testCurrentUTRIssue = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get a test student
    const student = await Student.findOne().limit(1);
    
    console.log('🧪 Testing Current UTR Issue');
    console.log('Student:', student.firstName, student.lastName);

    // Test: Create payment directly in database with UTR
    console.log('\n📝 Test: Creating payment with UTR directly in database');
    
    const testUTR = 'TEST-DIRECT-UTR-123456';
    const directPayment = new Payment({
      studentId: student._id,
      studentName: `${student.firstName} ${student.lastName}`.trim(),
      amount: 500,
      paymentMethod: 'UPI',
      description: 'Direct database test',
      transactionId: 'DIRECT-001',
      utr: testUTR,
      collectedBy: 'Direct Test',
      remarks: 'Testing direct UTR save'
    });

    console.log('Before save - UTR:', `"${directPayment.utr}"`);
    
    await directPayment.save();
    
    console.log('After save - Receipt:', directPayment.receiptNumber);
    console.log('After save - UTR:', `"${directPayment.utr}"`);

    // Verify from database
    const savedPayment = await Payment.findById(directPayment._id);
    console.log('From DB - UTR:', `"${savedPayment.utr}"`);
    
    if (savedPayment.utr === testUTR) {
      console.log('✅ SUCCESS: UTR saved correctly in database!');
    } else {
      console.log('❌ FAILURE: UTR not saved correctly');
      console.log('  Expected:', testUTR);
      console.log('  Got:', savedPayment.utr);
    }

    // Now check what happens with the current Payment model behavior
    console.log('\n🔍 Testing Payment model behavior with problematic values:');
    
    const testCases = [
      { utr: 'VALID-UTR-123', desc: 'Valid UTR' },
      { utr: undefined, desc: 'Undefined value' },
      { utr: 'undefined', desc: 'String "undefined"' },
      { utr: '', desc: 'Empty string' },
      { utr: null, desc: 'Null value' }
    ];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      
      console.log(`\n${i + 1}. Testing ${testCase.desc}:`);
      console.log(`   Input: ${JSON.stringify(testCase.utr)}`);
      
      const testPayment = new Payment({
        studentId: student._id,
        studentName: `${student.firstName} ${student.lastName}`.trim(),
        amount: 100,
        paymentMethod: 'UPI',
        description: `Model test ${testCase.desc}`,
        utr: testCase.utr
      });

      await testPayment.save();
      
      const savedTest = await Payment.findById(testPayment._id);
      console.log(`   Saved as: "${savedTest.utr}"`);
      console.log(`   Type: ${typeof savedTest.utr}`);
      
      // Clean up
      await Payment.findByIdAndDelete(testPayment._id);
    }

    // Clean up main test payment
    await Payment.findByIdAndDelete(directPayment._id);
    console.log('🧹 Test payments cleaned up');

    // Check recent real payments
    console.log('\n📊 Checking recent real payments:');
    const recentPayments = await Payment.find({})
      .sort({ createdAt: -1 })
      .limit(3);

    recentPayments.forEach((payment, index) => {
      console.log(`${index + 1}. ${payment.receiptNumber} - ${payment.paymentMethod}`);
      console.log(`   UTR: "${payment.utr}" (${typeof payment.utr})`);
      console.log(`   Created: ${payment.createdAt}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Current UTR issue test completed');

  } catch (error) {
    console.error('❌ Error testing current UTR issue:', error);
    process.exit(1);
  }
};

testCurrentUTRIssue();