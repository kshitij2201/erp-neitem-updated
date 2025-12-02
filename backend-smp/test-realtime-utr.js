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

const testRealTimeUTR = async () => {
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

    console.log('🧪 Real-time UTR Test');
    console.log('Student:', student.firstName, student.lastName);

    // Test 1: Direct API call with UTR (simulating frontend form)
    const testUTR = 'SBI R230710897456';
    const formData = {
      studentId: student._id.toString(),
      amount: "500",
      paymentMethod: "UPI",
      feeHead: "",
      description: "Real-time UTR test",
      transactionId: "RTT-001",
      utr: testUTR,
      collectedBy: "Test User",
      remarks: "Testing real-time UTR saving"
    };

    console.log('\n📤 Testing API call with UTR:', testUTR);
    console.log('Form data being sent:', JSON.stringify(formData, null, 2));

    try {
      const response = await fetch('http://erpbackend.tarstech.in/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add mock authorization if needed
          'Authorization': 'Bearer mock-token'
        },
        body: JSON.stringify(formData),
      });

      console.log('Response status:', response.status);
      
      if (response.status === 401) {
        console.log('❌ Authorization required. Testing direct database...');
        
        // Test direct database save
        const payment = new Payment({
          studentId: student._id,
          studentName: `${student.firstName} ${student.lastName}`.trim(),
          amount: parseFloat(formData.amount),
          paymentMethod: formData.paymentMethod,
          description: formData.description,
          transactionId: formData.transactionId,
          utr: formData.utr,
          collectedBy: formData.collectedBy,
          remarks: formData.remarks
        });

        console.log('Before save - UTR:', `"${payment.utr}"`);
        await payment.save();
        console.log('After save - UTR:', `"${payment.utr}"`);

        // Verify from database
        const savedPayment = await Payment.findById(payment._id);
        console.log('From DB - UTR:', `"${savedPayment.utr}"`);
        
        if (savedPayment.utr === testUTR) {
          console.log('✅ SUCCESS: UTR saved correctly!');
        } else {
          console.log('❌ FAILURE: UTR not saved correctly');
          console.log('  Expected:', testUTR);
          console.log('  Got:', savedPayment.utr);
        }

        console.log('Receipt:', savedPayment.receiptNumber);
        
        // Clean up
        await Payment.findByIdAndDelete(payment._id);
        console.log('🧹 Test payment cleaned up');

      } else if (response.ok) {
        const result = await response.json();
        console.log('✅ API Success!');
        console.log('Receipt:', result.payment.receiptNumber);
        console.log('UTR in response:', result.payment.utr);
        
        // Clean up
        if (result.payment._id) {
          await Payment.findByIdAndDelete(result.payment._id);
          console.log('🧹 Test payment cleaned up');
        }
      } else {
        const errorData = await response.json();
        console.log('❌ API Error:', errorData);
      }

    } catch (fetchError) {
      console.log('❌ Fetch error:', fetchError.message);
    }

    // Test 2: Check that UTR validation is working for required payments
    console.log('\n🧪 Testing UTR validation for UPI payment without UTR...');
    
    const invalidData = {
      studentId: student._id.toString(),
      amount: "300",
      paymentMethod: "UPI",
      feeHead: "",
      description: "Test without UTR",
      transactionId: "RTT-002",
      utr: "", // Empty UTR - should fail for UPI
      collectedBy: "Test User",
      remarks: "Testing validation"
    };

    try {
      const response = await fetch('http://erpbackend.tarstech.in/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      });

      if (response.status === 400) {
        const error = await response.json();
        console.log('✅ GOOD: Validation working - UPI without UTR rejected');
        console.log('Error message:', error.message);
      } else {
        console.log('❌ ISSUE: UPI payment without UTR was accepted');
      }

    } catch (validationError) {
      console.log('Network error during validation test:', validationError.message);
    }

    await mongoose.disconnect();
    console.log('✅ Real-time UTR test completed');

  } catch (error) {
    console.error('❌ Error in real-time UTR test:', error);
    process.exit(1);
  }
};

testRealTimeUTR();