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

const testUpdatedServer = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get a test student
    const student = await Student.findOne().limit(1);
    
    console.log('🧪 Testing Updated Server with UTR validation');
    console.log('Student:', student.firstName, student.lastName);

    // Test 1: Valid UPI payment with UTR (should work)
    console.log('\n📤 Test 1: UPI payment WITH UTR');
    
    const validData = {
      studentId: student._id.toString(),
      amount: "1000",
      paymentMethod: "UPI",
      feeHead: "",
      description: "Valid UPI with UTR",
      transactionId: "VALID-001",
      utr: "SBI R230710897456",
      collectedBy: "Test User",
      remarks: "Testing valid UTR"
    };

    try {
      const response1 = await fetch('http://localhost:4000/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validData),
      });

      console.log('Status:', response1.status);
      const result1 = await response1.json();

      if (response1.ok) {
        console.log('✅ SUCCESS: UPI with UTR accepted');
        console.log('Receipt:', result1.payment.receiptNumber);
        console.log('UTR saved:', result1.payment.utr);
        
        // Verify in database
        const dbPayment = await Payment.findById(result1.payment._id);
        console.log('UTR in DB:', `"${dbPayment.utr}"`);
        
        // Clean up
        await Payment.findByIdAndDelete(result1.payment._id);
        console.log('🧹 Test payment cleaned up');
      } else {
        console.log('❌ Valid payment rejected:', result1.message);
      }
      
    } catch (e1) {
      console.log('❌ Error in test 1:', e1.message);
    }

    // Test 2: UPI payment without UTR (should fail with new validation)
    console.log('\n📤 Test 2: UPI payment WITHOUT UTR (should fail)');
    
    const invalidData = {
      studentId: student._id.toString(),
      amount: "500",
      paymentMethod: "UPI",
      feeHead: "",
      description: "Invalid UPI without UTR",
      transactionId: "INVALID-001",
      utr: "", // Empty UTR - should fail
      collectedBy: "Test User",
      remarks: "Testing empty UTR"
    };

    try {
      const response2 = await fetch('http://localhost:4000/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      });

      console.log('Status:', response2.status);
      const result2 = await response2.json();

      if (response2.status === 400) {
        console.log('✅ GOOD: UPI without UTR properly rejected');
        console.log('Error message:', result2.message);
      } else if (response2.ok) {
        console.log('❌ ISSUE: UPI without UTR was accepted!');
        console.log('This means validation is not working');
        
        // Clean up if payment was created
        if (result2.payment && result2.payment._id) {
          await Payment.findByIdAndDelete(result2.payment._id);
        }
      } else {
        console.log('Unexpected response:', result2);
      }
      
    } catch (e2) {
      console.log('❌ Error in test 2:', e2.message);
    }

    // Test 3: Cash payment without UTR (should work - UTR not required for cash)
    console.log('\n📤 Test 3: Cash payment WITHOUT UTR (should work)');
    
    const cashData = {
      studentId: student._id.toString(),
      amount: "200",
      paymentMethod: "Cash",
      feeHead: "",
      description: "Cash payment",
      transactionId: "",
      utr: "", // Empty UTR - OK for cash
      collectedBy: "Test User",
      remarks: "Cash payment test"
    };

    try {
      const response3 = await fetch('http://localhost:4000/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cashData),
      });

      console.log('Status:', response3.status);
      const result3 = await response3.json();

      if (response3.ok) {
        console.log('✅ GOOD: Cash payment without UTR accepted');
        console.log('Receipt:', result3.payment.receiptNumber);
        
        // Clean up
        await Payment.findByIdAndDelete(result3.payment._id);
        console.log('🧹 Test payment cleaned up');
      } else {
        console.log('❌ ISSUE: Cash payment rejected:', result3.message);
      }
      
    } catch (e3) {
      console.log('❌ Error in test 3:', e3.message);
    }

    await mongoose.disconnect();
    console.log('\n✅ Updated server test completed');

  } catch (error) {
    console.error('❌ Error testing updated server:', error);
    process.exit(1);
  }
};

testUpdatedServer();