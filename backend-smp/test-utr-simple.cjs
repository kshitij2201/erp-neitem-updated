const axios = require('axios');

const testUTRWithAPI = async () => {
  try {
    const API_BASE = 'https://erpbackend.tarstech.in/api';

    console.log('🧪 Testing UTR API after server restart');

    // First check if server is responding
    console.log('🔍 Checking server health...');
    try {
      const healthResponse = await axios.get(`${API_BASE}/payments`);
      console.log('✅ Server is responding, found', healthResponse.data.length, 'payments');
    } catch (healthError) {
      console.log('❌ Server health check failed:', healthError.message);
      return;
    }

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
    console.log('📝 Payment data:', JSON.stringify(paymentData, null, 2));

    try {
      const response = await axios.post(`${API_BASE}/payments`, paymentData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log('✅ API Response Status:', response.status);
      console.log('✅ Response data:', JSON.stringify(response.data, null, 2));

    } catch (apiError) {
      console.log('❌ API Call failed:');
      if (apiError.response) {
        console.log('   Status:', apiError.response.status);
        console.log('   Data:', JSON.stringify(apiError.response.data, null, 2));
      } else {
        console.log('   Error:', apiError.message);
      }
    }

  } catch (error) {
    console.error('❌ General Error:', error.message);
  }
};

testUTRWithAPI();