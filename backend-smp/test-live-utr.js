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

const testLiveUTR = async () => {
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

    console.log('📝 Testing LIVE UTR saving for:', student.firstName, student.lastName);

    // Simulate EXACT frontend request with UTR
    const testUTR = 'SBI R230710897456';
    const frontendData = {
      studentId: student._id.toString(),
      amount: "1000",
      paymentMethod: "UPI", 
      feeHead: "",
      description: "Live UTR test",
      transactionId: "TXN-LIVE-001",
      utr: testUTR,
      collectedBy: "Live Test",
      remarks: "Testing live UTR saving"
    };

    console.log('📤 Sending live API request:');
    console.log('UTR being sent:', `"${frontendData.utr}"`);

    try {
      const response = await fetch('http://localhost:4000/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(frontendData),
      });

      console.log('📊 Response status:', response.status);
      const result = await response.json();

      if (response.ok) {
        console.log('✅ Payment created successfully!');
        console.log('📄 Receipt:', result.payment.receiptNumber);
        console.log('💰 Amount:', result.payment.amount);
        console.log('💳 Method:', result.payment.paymentMethod);
        console.log('🔢 UTR in response:', `"${result.payment.utr}"`);
        
        // Verify in database directly
        const dbPayment = await Payment.findById(result.payment._id);
        console.log('🔍 UTR in database:', `"${dbPayment.utr}"`);
        
        // Check if they match
        if (dbPayment.utr === testUTR) {
          console.log('🎉 SUCCESS: UTR saved correctly!');
        } else {
          console.log('❌ FAILURE: UTR not saved correctly');
          console.log('  Expected:', `"${testUTR}"`);
          console.log('  Got:', `"${dbPayment.utr}"`);
        }

        // Clean up test payment
        await Payment.findByIdAndDelete(result.payment._id);
        console.log('🧹 Test payment cleaned up');

      } else {
        console.log('❌ API Error:', result.message);
        console.log('Full error:', result);
      }

    } catch (fetchError) {
      console.log('❌ Network error:', fetchError.message);
      console.log('Make sure backend server is running on port 4000');
    }

    // Also test the current payment form behavior
    console.log('\n🧪 Testing current payment form behavior:');
    
    // Check recent payments to see current UTR storage
    const recentPayments = await Payment.find({ paymentMethod: { $in: ['UPI', 'Card', 'Bank Transfer', 'Online'] } })
      .sort({ createdAt: -1 })
      .limit(5);

    console.log(`📊 Recent digital payments (${recentPayments.length}):`);
    recentPayments.forEach((payment, index) => {
      console.log(`  ${index + 1}. ${payment.receiptNumber} - ${payment.paymentMethod}`);
      console.log(`     UTR: "${payment.utr}" (${payment.utr ? 'Has UTR' : 'No UTR'})`);
    });

    // Disconnect
    await mongoose.disconnect();
    console.log('✅ Live UTR test completed');

  } catch (error) {
    console.error('❌ Error in live UTR test:', error);
    process.exit(1);
  }
};

testLiveUTR();