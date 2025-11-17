import mongoose from 'mongoose';
import Student from './models/student.js';

async function checkSemesterData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/neitemerp');
    console.log('Connected to MongoDB');
    
    // Get a few students with semester data
    const students = await Student.find({})
      .limit(10)
      .populate('semester')
      .select('firstName semester department')
      .lean();
    
    console.log('Sample students with semester data:');
    students.forEach((student, i) => {
      console.log(`Student ${i+1}: ${student.firstName}, Semester: ${JSON.stringify(student.semester)}`);
    });
    
    // Check if there's a Semester collection
    const collections = await mongoose.connection.db.listCollections().toArray();
    const semesterCollection = collections.find(c => 
      c.name.toLowerCase().includes('semester')
    );
    console.log('Semester-related collections:', semesterCollection ? semesterCollection.name : 'None found');
    
    // Check what semester values look like without populate
    const rawStudents = await Student.find({}).limit(5).select('firstName semester').lean();
    console.log('\nRaw semester values:');
    rawStudents.forEach((student, i) => {
      console.log(`Student ${i+1}: ${student.firstName}, Raw Semester: ${student.semester}`);
    });
    
    // Check distinct semester values
    const distinctSemesters = await Student.distinct('semester');
    console.log('\nDistinct semester values in database:', distinctSemesters);
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSemesterData();