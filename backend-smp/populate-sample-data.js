import mongoose from 'mongoose';
import Faculty from './models/faculty.js';
import SalaryRecord from './models/SalaryRecord.js';

async function populateSampleData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/erp-neitem', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to database');

    // Clear existing data
    await Faculty.deleteMany({});
    await SalaryRecord.deleteMany({});
    console.log('Cleared existing data');

    // Create sample faculty records
    const sampleFaculty = [
      {
        employeeId: 'EMP001',
        title: 'Dr',
        firstName: 'John',
        lastName: 'Smith',
        department: 'Computer Science',
        designation: 'Professor',
        type: 'teaching',
        email: 'john.smith@university.edu',
        phone: '1234567890'
      },
      {
        employeeId: 'EMP002',
        title: 'Dr',
        firstName: 'Sarah',
        lastName: 'Johnson',
        department: 'Mathematics',
        designation: 'Associate Professor',
        type: 'teaching',
        email: 'sarah.johnson@university.edu',
        phone: '1234567891'
      },
      {
        employeeId: 'EMP003',
        title: 'Mr',
        firstName: 'Robert',
        lastName: 'Davis',
        department: 'Administration',
        designation: 'Administrative Officer',
        type: 'non-teaching',
        email: 'robert.davis@university.edu',
        phone: '1234567892'
      }
    ];

    // Insert faculty records
    const insertedFaculty = await Faculty.insertMany(sampleFaculty);
    console.log('Inserted faculty records:', insertedFaculty.length);

    // Create salary records for each faculty
    const salaryRecords = insertedFaculty.map(faculty => ({
      employeeId: faculty.employeeId,
      name: faculty.name,
      department: faculty.department,
      designation: faculty.designation,
      type: faculty.type,
      basicSalary: faculty.type === 'teaching' ? 50000 : 35000,
      hra: faculty.type === 'teaching' ? 10000 : 7000,
      da: faculty.type === 'teaching' ? 5000 : 3500,
      bonus: 2000,
      grossSalary: faculty.type === 'teaching' ? 67000 : 47000,
      taxDeduction: faculty.type === 'teaching' ? 5000 : 3500,
      pfDeduction: faculty.type === 'teaching' ? 3000 : 2100,
      otherDeductions: 500,
      netSalary: faculty.type === 'teaching' ? 59000 : 41300,
      paymentDate: new Date(),
      paymentMethod: 'Bank Transfer',
      workingHours: 160,
      status: 'Processed'
    }));

    // Insert salary records
    const insertedSalaries = await SalaryRecord.insertMany(salaryRecords);
    console.log('Inserted salary records:', insertedSalaries.length);

    console.log('Sample data populated successfully!');
    console.log('You can now test the salary slip with employeeId: EMP001, EMP002, or EMP003');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

populateSampleData();