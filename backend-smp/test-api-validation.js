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

const testAPIValidation = async () => {
  try {
    // Connect to MongoDB first
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get a test student
    const student = await Student.findOne().limit(1);
    if (!student) {
      console.log('❌ No students found in database');
      return;
    }

    console.log('📝 Testing API validation for student:', student.firstName, student.lastName);

    // Test API endpoint directly
    const testData = {
      studentId: student._id.toString(),
      amount: "300",
      paymentMethod: "UPI",
      feeHead: "",
      description: "API test without UTR",
      transactionId: "TXN-API-TEST",
      utr: "", // Empty UTR - should be rejected
      collectedBy: "API Test",
      remarks: "Testing API validation"
    };

    console.log('📤 Sending request to API with empty UTR:');
    console.log(JSON.stringify(testData, null, 2));

    try {
      const response = await fetch('https://backenderp.tarstech.in/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('❌ UNEXPECTED: API accepted payment without UTR!');
        console.log('Response:', result);

        // Clean up if payment was created
        if (result.payment && result.payment._id) {
          await Payment.findByIdAndDelete(result.payment._id);
          console.log('🧹 Test payment cleaned up');
        }
      } else {
        console.log('✅ EXPECTED: API rejected payment without UTR');
        console.log('Status:', response.status);
        console.log('Error:', result.message);
      }
    } catch (fetchError) {
      console.log('❌ Network error testing API:', fetchError.message);
    }

    // Test with valid UTR
    console.log('\n📤 Testing API with valid UTR:');
    const validTestData = {
      ...testData,
      utr: "VALID-API-UTR-123456789",
      description: "API test with UTR"
    };

    try {
      const response = await fetch('https://backenderp.tarstech.in/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validTestData),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ SUCCESS: API accepted payment with valid UTR');
        console.log('Receipt:', result.payment.receiptNumber);
        console.log('UTR saved:', result.payment.utr);

        // Clean up
        await Payment.findByIdAndDelete(result.payment._id);
        console.log('🧹 Test payment cleaned up');
      } else {
        console.log('❌ UNEXPECTED: API rejected valid payment');
        console.log('Error:', result.message);
      }
    } catch (fetchError) {
      console.log('❌ Network error testing API:', fetchError.message);
    }

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('✅ API validation tests completed');

  } catch (error) {
    console.error('❌ Error testing API validation:', error);
    process.exit(1);
  }
};

// Run the test
testAPIValidation();