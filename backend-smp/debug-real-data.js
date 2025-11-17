import mongoose from 'mongoose';
import Student from './models/StudentManagement.js';
import Department from './models/AcademicDepartment.js';
import Semester from './models/Semester.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function debugStudentData() {
  try {
    console.log('Connecting to MongoDB...');
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
    
    // Get some students with populated data
    const students = await Student.find({})
      .limit(10)
      .populate('department', 'name')
      .populate('semester', 'number')
      .lean();
    
    console.log('\nSample student records:');
    students.forEach((student, i) => {
      console.log(`\nStudent ${i+1}:`);
      console.log('Name:', student.firstName, student.lastName);
      console.log('Raw semester field:', student.semester);
      console.log('Populated semester:', student.semester?.number || 'Not populated');
      console.log('Department:', student.department?.name || 'Not populated');
      console.log('Section:', student.section);
    });
    
    // Check distinct semester ObjectIds
    const distinctSemesterIds = await Student.distinct('semester');
    console.log('\nDistinct semester ObjectIds:', distinctSemesterIds);
    
    // Get all semesters to see what numbers exist
    const allSemesters = await Semester.find({}).lean();
    console.log('\nAll semesters in Semester collection:');
    allSemesters.forEach(sem => {
      console.log(`Semester ID: ${sem._id}, Number: ${sem.number}`);
    });
    
    // Check departments
    const allDepts = await Department.find({}).select('name').lean();
    console.log('\nAll departments:');
    allDepts.forEach(dept => {
      console.log(`Department ID: ${dept._id}, Name: ${dept.name}`);
    });
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

debugStudentData();