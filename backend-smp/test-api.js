import axios from 'axios';

async function testAPI() {
  try {
    // You'll need to replace this with a valid token from your login
    const token = 'YOUR_JWT_TOKEN_HERE';
    const department = 'CSE & AIML'; // or try 'Civil', 'Electrical', etc.
    
    const response = await axios.get(
      `https://backenderp.tarstech.in/api/faculty/students-attendance/department/${encodeURIComponent(department)}`,
      {
        headers: { 
          Authorization: `Bearer ${token}` 
        }
      }
    );
    
    console.log('API Response Success:', response.data.success);
    console.log('Total students found:', response.data.data?.students?.length || 0);
    
    if (response.data.data?.students?.length > 0) {
      console.log('\nSample students:');
      response.data.data.students.slice(0, 5).forEach((student, i) => {
        console.log(`Student ${i+1}: ${student.name}, Semester: ${student.year}, Department: ${student.department}`);
      });
      
      // Check semester distribution
      const semesterCounts = {};
      response.data.data.students.forEach(student => {
        semesterCounts[student.year] = (semesterCounts[student.year] || 0) + 1;
      });
      
      console.log('\nSemester distribution:');
      Object.entries(semesterCounts).forEach(([sem, count]) => {
        console.log(`Semester ${sem}: ${count} students`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

console.log('To test the API, you need to:');
console.log('1. Start the backend server (npm start or node server.js)');
console.log('2. Get a valid JWT token by logging in');
console.log('3. Replace YOUR_JWT_TOKEN_HERE with the actual token');
console.log('4. Run: node test-api.js');