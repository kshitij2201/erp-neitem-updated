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

const testExactUTRStorage = async () => {
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

    console.log('📝 Testing exact UTR storage for student:', student.firstName, student.lastName);

    // Test with the exact UTR format the user mentioned
    const testUTR = 'SBI R230710897456';
    const payment = new Payment({
      studentId: student._id,
      studentName: `${student.firstName} ${student.lastName}`.trim(),
      amount: 1000,
      paymentMethod: 'UPI',
      description: 'Test exact UTR storage',
      transactionId: 'TXN-EXACT-TEST',
      utr: testUTR,
      collectedBy: 'UTR Test',
      remarks: 'Testing exact UTR storage'
    });

    console.log('💾 Saving payment with UTR:', testUTR);
    console.log('   - UTR length:', testUTR.length);
    console.log('   - UTR characters:', testUTR.split('').join('|'));

    await payment.save();

    console.log('✅ Payment saved successfully!');
    console.log('📄 Receipt Number:', payment.receiptNumber);

    // Retrieve and verify
    const savedPayment = await Payment.findById(payment._id);

    console.log('🔍 Verification:');
    console.log('   - Original UTR:', `"${testUTR}"`);
    console.log('   - Saved UTR:', `"${savedPayment.utr}"`);
    console.log('   - Exact match:', savedPayment.utr === testUTR ? '✅ YES' : '❌ NO');
    console.log('   - Length match:', savedPayment.utr.length === testUTR.length ? '✅ YES' : '❌ NO');

    if (savedPayment.utr === testUTR) {
      console.log('🎉 SUCCESS: UTR stored exactly as entered!');
      console.log('   The database preserves spaces, special characters, and exact formatting.');
    }

    // Test with different UTR formats
    const testUTRs = [
      'SBI R230710897456',           // Original format
      'HDFC-123456789012',           // With dash
      'ICICI/987654321098',          // With slash
      'AXIS_456789123456',           // With underscore
      'PNB 789123456789 ABC',        // With spaces and text
      '12345678901234567890'         // Numbers only
    ];

    console.log('\n🧪 Testing various UTR formats:');

    for (let i = 0; i < testUTRs.length; i++) {
      const utr = testUTRs[i];
      const testPayment = new Payment({
        studentId: student._id,
        studentName: `${student.firstName} ${student.lastName}`.trim(),
        amount: 100,
        paymentMethod: 'UPI',
        description: `UTR format test ${i + 1}`,
        transactionId: `TXN-FORMAT-${i + 1}`,
        utr: utr,
        collectedBy: 'Format Test'
      });

      await testPayment.save();

      const saved = await Payment.findById(testPayment._id);

      console.log(`   ${i + 1}. "${utr}" → "${saved.utr}" ${saved.utr === utr ? '✅' : '❌'}`);

      // Clean up
      await Payment.findByIdAndDelete(testPayment._id);
    }

    // Clean up main test payment
    await Payment.findByIdAndDelete(payment._id);
    console.log('🧹 Test payments cleaned up');

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('✅ Exact UTR storage test completed');

  } catch (error) {
    console.error('❌ Error testing exact UTR storage:', error);
    process.exit(1);
  }
};

// Run the test
testExactUTRStorage();