import axios from 'axios';

async function testFeeSummary() {
  try {
    const baseURL = 'https://backenderp.tarstech.in/api';

    // Test data - using one of the student IDs from the user's message
    const studentId = '68f09b78006a2091da09439e'; // ANUSHKA PATIL

    console.log('Testing Fee Summary API...');
    console.log('Student ID:', studentId);

    // First check if student exists
    try {
      const studentCheck = await axios.get(`${baseURL}/students/${studentId}`);
      console.log('Student exists:', !!studentCheck.data);
    } catch (err) {
      console.log('Student check failed:', err.response?.status, err.response?.data?.message);
    }

    // Test updating fee summary
    console.log('Testing PUT /students/:id/fee-summary...');
    const updateResponse = await axios.put(
      `${baseURL}/students/${studentId}/fee-summary`,
      {
        totalFees: 75000,
        paidFees: 45000,
        pendingFees: 30000
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Update Response:', updateResponse.data);

    // Test getting fee summary
    console.log('Testing GET /students/:id/fee-summary...');
    const getResponse = await axios.get(`${baseURL}/students/${studentId}/fee-summary`);
    console.log('Get Response:', getResponse.data);

    // Test getting all fee summaries
    console.log('Testing GET /students/fee-summaries/all...');
    const allResponse = await axios.get(`${baseURL}/students/fee-summaries/all`);
    console.log('All Fee Summaries Count:', allResponse.data.data?.length || 0);

  } catch (error) {
    console.error('Error details:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
}

testFeeSummary();