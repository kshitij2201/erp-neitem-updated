import mongoose from 'mongoose';
import Student from './models/StudentManagement.js';
import Department from './models/AcademicDepartment.js';
import Semester from './models/Semester.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testStudentQuery() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas');
    
    // Find a department
    const department = 'CSE & AIML';
    const departmentDoc = await Department.findOne({
      name: { $regex: new RegExp(`^${department}$`, "i") },
    });
    
    if (!departmentDoc) {
      console.log('Department not found');
      return;
    }
    
    console.log(`Found department: ${departmentDoc.name} (ID: ${departmentDoc._id})`);
    
    // Get students with populated semester
    const students = await Student.find({
      department: departmentDoc._id,
    })
      .populate("department", "name")
      .populate("semester", "number")
      .select("firstName lastName semester department section")
      .lean();
    
    console.log(`Found ${students.length} students in ${department}`);
    
    // Transform and show semester distribution
    const transformedStudents = students.map((student) => ({
      name: [student.firstName, student.lastName].join(" "),
      year: student.semester?.number || 1,
      department: student.department?.name || department,
      section: student.section
    }));
    
    // Count by semester
    const semesterCounts = {};
    transformedStudents.forEach(student => {
      semesterCounts[student.year] = (semesterCounts[student.year] || 0) + 1;
    });
    
    console.log('\nSemester distribution:');
    Object.entries(semesterCounts).sort().forEach(([sem, count]) => {
      console.log(`Semester ${sem}: ${count} students`);
    });
    
    // Show some examples
    console.log('\nSample students:');
    transformedStudents.slice(0, 10).forEach((student, i) => {
      console.log(`${i+1}. ${student.name} - Semester ${student.year}, Section: ${student.section || 'Not set'}`);
    });
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

testStudentQuery();