import mongoose from 'mongoose';
import Student from './models/student.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function checkRealStudentData() {
  try {
    console.log('Connecting to:', process.env.MONGO_URI.replace(/\/\/.*@/, '//***:***@'));
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas');
    
    // Check total count
    const totalStudents = await Student.countDocuments();
    console.log(`Total students in database: ${totalStudents}`);
    
    if (totalStudents === 0) {
      console.log('No students found in database');
      mongoose.disconnect();
      return;
    }
    
    // Get some students with all fields
    const students = await Student.find({})
      .limit(10)
      .lean();
    
    console.log('\nSample student records:');
    students.forEach((student, i) => {
      console.log(`\nStudent ${i+1}:`);
      console.log('Name:', student.firstName, student.lastName);
      console.log('Semester field:', student.semester, typeof student.semester);
      console.log('Department:', student.department, typeof student.department);
      console.log('Section:', student.section);
    });
    
    // Check distinct semester values
    const distinctSemesters = await Student.distinct('semester');
    console.log('\nDistinct semester values:', distinctSemesters);
    
    // Check distinct departments
    const distinctDepts = await Student.distinct('department');
    console.log('Distinct department values:', distinctDepts);
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkRealStudentData();