const mongoose = require('mongoose');
const Payment = require('./models/Payment.js');
require('dotenv').config();

const simulatePaymentCreation = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Simulate frontend form submission with empty UTR
    const formData = {
      studentId: '674373c97969b1c5d37a54da',
      studentName: 'Test Student', 
      amount: '1000',
      paymentMethod: 'UPI',
      description: 'Test payment',
      transactionId: 'TEST-001',
      utr: '', // Empty UTR like frontend was sending
      collectedBy: 'Test User',
      remarks: 'Testing empty UTR'
    };

    console.log('🧪 Simulating frontend payment with empty UTR:');
    console.log('Form data UTR:', `"${formData.utr}"`);

    // Old frontend logic (before fix)
    const paymentDataOld = {
      studentId: formData.studentId,
      studentName: formData.studentName,
      amount: parseFloat(formData.amount),
      paymentMethod: formData.paymentMethod,
      description: formData.description,
      transactionId: formData.transactionId,
      collectedBy: formData.collectedBy,
      remarks: formData.remarks,
    };

    // Old UTR assignment
    if (['Online', 'Bank Transfer', 'Card', 'UPI'].includes(formData.paymentMethod)) {
      paymentDataOld.utr = formData.utr || ""; // This was the problem
    }

    console.log('\n❌ OLD Frontend Logic:');
    console.log('UTR sent to API:', `"${paymentDataOld.utr}"`);

    // New frontend logic (after fix)
    const paymentDataNew = {
      studentId: formData.studentId,
      studentName: formData.studentName,
      amount: parseFloat(formData.amount),
      paymentMethod: formData.paymentMethod,
      description: formData.description,
      transactionId: formData.transactionId,
      collectedBy: formData.collectedBy,
      remarks: formData.remarks,
    };

    // New UTR validation
    if (['Online', 'Bank Transfer', 'Card', 'UPI'].includes(formData.paymentMethod)) {
      if (!formData.utr || formData.utr.trim() === "") {
        console.log('\n✅ NEW Frontend Logic: Would show error - "UTR required"');
        return;
      }
      paymentDataNew.utr = formData.utr.trim();
    }

    await mongoose.disconnect();
    console.log('\n✅ Frontend logic comparison completed');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

simulatePaymentCreation();