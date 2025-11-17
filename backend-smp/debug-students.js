import mongoose from 'mongoose';
import Student from './models/student.js';

async function checkStudentData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/neitemerp');
    console.log('Connected to MongoDB');
    
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
      .limit(5)
      .lean();
    
    console.log('\nSample student records:');
    students.forEach((student, i) => {
      console.log(`\nStudent ${i+1}:`);
      console.log('Name:', student.firstName, student.lastName);
      console.log('Semester:', student.semester);
      console.log('Department:', student.department);
      console.log('Section:', student.section);
      console.log('All fields:', Object.keys(student));
    });
    
    // Check all collections in database
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nAll collections in database:');
    collections.forEach(c => console.log('-', c.name));
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkStudentData();