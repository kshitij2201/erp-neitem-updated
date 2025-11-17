import mongoose from 'mongoose';
import SalaryRecord from './models/SalaryRecord.js';
import Faculty from './models/faculty.js';

async function testSalaryRecords() {
  try {
    await mongoose.connect('mongodb://localhost:27017/erp-neitem', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to database');

    // Check if there are any salary records
    const salaryCount = await SalaryRecord.countDocuments();
    console.log('Total salary records:', salaryCount);

    // Check if there are any faculty records
    const facultyCount = await Faculty.countDocuments();
    console.log('Total faculty records:', facultyCount);

    // Get a sample faculty record
    const sampleFaculty = await Faculty.findOne().limit(1);
    if (sampleFaculty) {
      console.log('Sample faculty:', {
        employeeId: sampleFaculty.employeeId,
        name: sampleFaculty.name,
        department: sampleFaculty.department,
        designation: sampleFaculty.designation
      });

      // Check if there are salary records for this faculty
      const facultySalaryRecords = await SalaryRecord.find({ employeeId: sampleFaculty.employeeId });
      console.log('Salary records for this faculty:', facultySalaryRecords.length);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSalaryRecords();