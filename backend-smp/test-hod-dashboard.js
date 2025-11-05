const axios = require('axios');

const BASE_URL = 'https://backenderp.tarstech.in/api';

async function testHodDashboard() {
  try {
    console.log('🚀 Testing HOD Dashboard API...');
    
    // First, let's try to login as an HOD user
    // You would need to replace these with actual HOD credentials
    const loginData = {
      email: 'hod@example.com', // Replace with actual HOD email
      password: 'password123'   // Replace with actual password
    };
    
    console.log('📝 Attempting login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, loginData);
    
    if (loginResponse.data.token) {
      console.log('✅ Login successful!');
      const token = loginResponse.data.token;
      
      // Now make the HOD dashboard API call
      console.log('📊 Fetching HOD dashboard stats...');
      const dashboardResponse = await axios.get(`${BASE_URL}/dashboard/hod-stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📈 Dashboard Response:', dashboardResponse.data);
    } else {
      console.log('❌ Login failed - no token received');
    }
    
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Network Error:', error.message);
    }
  }
}

// Alternative: Test without authentication to see debug logs
async function testWithoutAuth() {
  try {
    console.log('🔍 Testing API endpoint without auth to see error logs...');
    const response = await axios.get(`${BASE_URL}/dashboard/hod-stats`);
    console.log('Response:', response.data);
  } catch (error) {
    console.log('Expected auth error:', error.response?.status, error.response?.data);
  }
}

// Run both tests
testWithoutAuth();
testHodDashboard();