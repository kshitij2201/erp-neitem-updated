const axios = require('axios');

const testUTRWithAPI = async () => {
  try {
    const API_BASE = 'https://backenderp.tarstech.in/api';

    console.log('🧪 Testing UTR API after server restart');

    // Test: Create payment via API with UTR
    const paymentData = {
      studentId: '674373c97969b1c5d37a54da', // Using existing student ID
      studentName: 'Test Student',
      amount: 1000,
      paymentMethod: 'UPI',
      description: 'API UTR Test',
      transactionId: 'API-TEST-001',
      utr: 'API-UTR-TEST-123456789',
      collectedBy: 'Test User',
      remarks: 'Testing UTR via API'
    };

    console.log('📝 Sending payment with UTR:', paymentData.utr);

    const response = await axios.post(`${API_BASE}/payments`, paymentData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ API Response Status:', response.status);
    console.log('✅ Created Payment Receipt:', response.data.payment?.receiptNumber);
    console.log('✅ UTR in Response:', `"${response.data.payment?.utr}"`);

    // Verify by fetching the payment
    const receiptNumber = response.data.payment?.receiptNumber;
    if (receiptNumber) {
      const verifyResponse = await axios.get(`${API_BASE}/payments`);
      const createdPayment = verifyResponse.data.find(p => p.receiptNumber === receiptNumber);
      
      if (createdPayment) {
        console.log('🔍 Verification from API:');
        console.log('   Receipt:', createdPayment.receiptNumber);
        console.log('   Method:', createdPayment.paymentMethod);
        console.log('   UTR:', `"${createdPayment.utr}"`);
        
        if (createdPayment.utr === paymentData.utr) {
          console.log('🎉 SUCCESS: UTR saved and retrieved correctly!');
        } else {
          console.log('❌ FAILURE: UTR mismatch');
          console.log('   Expected:', paymentData.utr);
          console.log('   Got:', createdPayment.utr);
        }
      }
    }

    // Test different payment methods with UTR
    const testMethods = ['UPI', 'Bank Transfer'];
    
    for (const method of testMethods) {
      console.log(`\n🧪 Testing ${method} with UTR requirement:`);
      
      const testData = {
        studentId: '674373c97969b1c5d37a54da',
        studentName: 'Test Student',
        amount: 500,
        paymentMethod: method,
        description: `${method} UTR Test`,
        transactionId: `${method.toUpperCase().replace(' ', '')}-001`,
        utr: `${method.toUpperCase().replace(' ', '')}-UTR-123456`,
        collectedBy: 'Test User'
      };

      try {
        const methodResponse = await axios.post(`${API_BASE}/payments`, testData);
        console.log(`   ✅ ${method}: UTR "${methodResponse.data.payment?.utr}" saved`);
      } catch (error) {
        console.log(`   ❌ ${method} failed:`, error.response?.data?.message || error.message);
      }
    }

    // Test without UTR for digital payment (should fail)
    console.log('\n🚫 Testing digital payment without UTR (should fail):');
    try {
      const noUTRData = {
        studentId: '674373c97969b1c5d37a54da',
        studentName: 'Test Student',
        amount: 500,
        paymentMethod: 'UPI',
        description: 'No UTR Test',
        transactionId: 'NO-UTR-001',
        // utr: missing
        collectedBy: 'Test User'
      };

      const noUTRResponse = await axios.post(`${API_BASE}/payments`, noUTRData);
      console.log('   ❌ ERROR: Payment should have failed without UTR');
    } catch (error) {
      console.log('   ✅ GOOD: Payment correctly rejected:', error.response?.data?.message);
    }

  } catch (error) {
    console.error('❌ API Test Error:', error.response?.data || error.message);
  }
};

testUTRWithAPI();