import axios from 'axios';

async function testSalaryAPI() {
  try {
    console.log('Testing salary API with employeeId EMP001...');

    const response = await axios.get('http://localhost:5000/api/salary', {
      params: { employeeId: 'EMP001' }
    });

    console.log('API Response Status:', response.status);
    console.log('Salary Records Found:', response.data.length);
    if (response.data.length > 0) {
      console.log('Sample Salary Record:');
      console.log(JSON.stringify(response.data[0], null, 2));
    } else {
      console.log('No salary records found for EMP001');
    }
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
  }
}

testSalaryAPI();