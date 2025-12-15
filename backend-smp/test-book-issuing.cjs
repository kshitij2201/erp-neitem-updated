const axios = require('axios');

async function testBookIssuing() {
  try {
    console.log('Testing book issuing API...');
    
    const issueData = {
      ACCNO: "500",
      bookTitle: "nayan book",
      author: "Test Author",
      publisher: "Cengage Learning",
      isbn: "500",
      borrowerType: "student",
      studentId: "CSB.TECH002",
      studentName: "Kshitij deodas Meshram",
      semester: "3",
      course: "B.Tech",
      department: "CS",
      email: "kshitij@gmail.com",
      phone: "8520741963",
      issueDate: "2025-12-03",
      dueDate: "2025-12-18"
    };

    console.log('Sending request with data:', JSON.stringify(issueData, null, 2));

    const response = await axios.post('http://localhost:4000/api/issues/issue', issueData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Book issued successfully!');
    console.log('Response:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ Error issuing book:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received:', error.request);
      console.error('Code:', error.code);
    } else {
      console.error('Error:', error.message);
    }
    console.error('Full error object:', error);
  }
}

testBookIssuing();