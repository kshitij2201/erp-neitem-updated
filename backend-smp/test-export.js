import fetch from 'node-fetch';

const testExportEndpoint = async () => {
  try {
    const testData = {
      stream: 'B.Tech',
      department: 'CS',
      year: '1st',
      admissionFees: true,
      examFees: false
    };

    console.log('Testing export endpoint with data:', testData);

    const response = await fetch('https://backenderp.tarstech.in/api/receipts/export-filtered', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });

    const data = await response.json();

    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('Test failed:', error.message);
  }
};

testExportEndpoint();