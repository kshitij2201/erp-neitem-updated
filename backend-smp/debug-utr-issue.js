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

const debugUTRIssue = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get a test student
    const student = await Student.findOne().limit(1);
    if (!student) {
      console.log('❌ No students found');
      return;
    }

    console.log('📝 Debug UTR issue for:', student.firstName, student.lastName);

    // Test direct payment creation (simulating backend)
    console.log('\n🧪 Test 1: Direct payment creation with UTR');
    
    const testUTR = 'SBI R230710897456';
    console.log('Creating payment with UTR:', `"${testUTR}"`);
    
    const payment = new Payment({
      studentId: student._id,
      studentName: `${student.firstName} ${student.lastName}`.trim(),
      amount: 500,
      paymentMethod: 'UPI',
      description: 'Debug UTR test',
      transactionId: 'DEBUG-001',
      utr: testUTR,
      collectedBy: 'Debug Test',
      remarks: 'UTR debug test'
    });

    console.log('Before save - payment.utr:', `"${payment.utr}"`);
    
    await payment.save();
    console.log('After save - payment.utr:', `"${payment.utr}"`);
    
    // Verify from database
    const saved = await Payment.findById(payment._id);
    console.log('From DB - saved.utr:', `"${saved.utr}"`);
    
    if (saved.utr === testUTR) {
      console.log('✅ SUCCESS: UTR saved correctly via direct creation');
    } else {
      console.log('❌ FAILURE: UTR not saved correctly');
    }

    // Test 2: Check recent payments from frontend
    console.log('\n🧪 Test 2: Check recent payments with missing UTR');
    
    const recentPayments = await Payment.find({
      paymentMethod: { $in: ['UPI', 'Card', 'Bank Transfer', 'Online'] },
      $or: [
        { utr: { $exists: false } },
        { utr: '' },
        { utr: null },
        { utr: 'undefined' }
      ]
    }).sort({ createdAt: -1 }).limit(10);

    console.log(`Found ${recentPayments.length} payments with missing/invalid UTR:`);
    
    recentPayments.forEach((p, i) => {
      console.log(`  ${i+1}. ${p.receiptNumber} - ${p.paymentMethod} - UTR: "${p.utr}"`);
    });

    // Test 3: Check what happens with undefined vs empty string
    console.log('\n🧪 Test 3: Testing undefined vs empty string');
    
    // Test with undefined
    const payment2 = new Payment({
      studentId: student._id,
      studentName: `${student.firstName} ${student.lastName}`.trim(),
      amount: 100,
      paymentMethod: 'UPI',
      description: 'Test undefined UTR',
      utr: undefined  // This might be the issue
    });
    
    await payment2.save();
    const saved2 = await Payment.findById(payment2._id);
    console.log('Undefined UTR test - saved as:', `"${saved2.utr}"`);
    
    // Test with empty string
    const payment3 = new Payment({
      studentId: student._id,
      studentName: `${student.firstName} ${student.lastName}`.trim(),
      amount: 100,
      paymentMethod: 'UPI', 
      description: 'Test empty UTR',
      utr: ''  // Empty string
    });
    
    await payment3.save();
    const saved3 = await Payment.findById(payment3._id);
    console.log('Empty string UTR test - saved as:', `"${saved3.utr}"`);

    // Clean up test payments
    await Payment.findByIdAndDelete(payment._id);
    await Payment.findByIdAndDelete(payment2._id);
    await Payment.findByIdAndDelete(payment3._id);
    console.log('🧹 Test payments cleaned up');

    await mongoose.disconnect();
    console.log('✅ UTR debug completed');

  } catch (error) {
    console.error('❌ Error in UTR debug:', error);
    process.exit(1);
  }
};

debugUTRIssue();