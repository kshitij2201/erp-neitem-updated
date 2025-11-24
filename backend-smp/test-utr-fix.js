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

const testUTRFix = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get a test student
    const student = await Student.findOne().limit(1);

    console.log('🧪 Testing UTR fix with various inputs:');

    // Test cases
    const testCases = [
      { utr: 'SBI R230710897456', expected: 'SBI R230710897456', desc: 'Valid UTR' },
      { utr: '', expected: '', desc: 'Empty string' },
      { utr: undefined, expected: '', desc: 'Undefined value' },
      { utr: 'undefined', expected: '', desc: 'String "undefined"' },
      { utr: null, expected: '', desc: 'Null value' },
      { utr: 'null', expected: '', desc: 'String "null"' },
      { utr: '  HDFC123456789  ', expected: 'HDFC123456789', desc: 'UTR with spaces' },
    ];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      
      console.log(`\n${i + 1}. Testing ${testCase.desc}:`);
      console.log(`   Input: ${JSON.stringify(testCase.utr)}`);
      
      const payment = new Payment({
        studentId: student._id,
        studentName: `${student.firstName} ${student.lastName}`.trim(),
        amount: 100,
        paymentMethod: 'UPI',
        description: `Test ${testCase.desc}`,
        utr: testCase.utr
      });

      await payment.save();
      
      const saved = await Payment.findById(payment._id);
      console.log(`   Output: "${saved.utr}"`);
      console.log(`   Expected: "${testCase.expected}"`);
      console.log(`   ✅ ${saved.utr === testCase.expected ? 'PASS' : '❌ FAIL'}`);
      
      // Clean up
      await Payment.findByIdAndDelete(payment._id);
    }

    console.log('\n🔧 Testing payment creation with problematic UTR values:');
    
    // Test the exact scenario that was causing issues
    const problematicData = {
      studentId: student._id.toString(),
      amount: "300",
      paymentMethod: "UPI",
      feeHead: "",
      description: "Test problematic UTR",
      transactionId: "",
      utr: undefined, // This was causing the issue
      collectedBy: "",
      remarks: ""
    };

    console.log('Creating payment with undefined UTR...');
    
    const payment = new Payment({
      studentId: problematicData.studentId,
      studentName: `${student.firstName} ${student.lastName}`.trim(),
      amount: parseFloat(problematicData.amount),
      paymentMethod: problematicData.paymentMethod,
      description: problematicData.description || '',
      transactionId: problematicData.transactionId || '',
      utr: (problematicData.utr && problematicData.utr !== 'undefined' && problematicData.utr.trim() !== '') ? problematicData.utr.trim() : '',
      collectedBy: problematicData.collectedBy || '',
      remarks: problematicData.remarks || ''
    });

    await payment.save();
    
    const savedPayment = await Payment.findById(payment._id);
    console.log(`✅ UTR saved as: "${savedPayment.utr}" (length: ${savedPayment.utr.length})`);
    
    if (savedPayment.utr === '') {
      console.log('🎉 SUCCESS: Undefined UTR is now properly handled as empty string!');
    } else {
      console.log('❌ ISSUE: UTR still not handled correctly');
    }

    // Clean up
    await Payment.findByIdAndDelete(payment._id);

    await mongoose.disconnect();
    console.log('✅ UTR fix test completed');

  } catch (error) {
    console.error('❌ Error testing UTR fix:', error);
    process.exit(1);
  }
};

testUTRFix();