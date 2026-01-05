const mongoose = require('mongoose');

async function createSampleStudent() {
  try {
    await mongoose.connect('mongodb://localhost:27017/erp-neitem', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to database');

    // Access the students collection directly
    const db = mongoose.connection.db;
    const collection = db.collection('students');

    // Check if student already exists
    const existingStudent = await collection.findOne({ studentId: "CSB.TECH002" });
    if (existingStudent) {
      console.log('Student CSB.TECH002 already exists');
      console.log('Student details:');
      console.log(`Student ID: ${existingStudent.studentId}`);
      console.log(`Name: ${existingStudent.firstName} ${existingStudent.lastName}`);
      console.log(`Email: ${existingStudent.email}`);
      console.log(`Phone: ${existingStudent.mobileNumber}`);
      
      await mongoose.disconnect();
      return;
    }

    // Create a sample student
    const sampleStudent = {
      studentId: "CSB.TECH002",
      firstName: "Kshitij deodas",
      lastName: "Meshram", 
      email: "kshitij@gmail.com",
      mobileNumber: "8520741963",
      semester: { number: 3 },
      stream: { name: "B.Tech" },
      department: { name: "CS" },
      course: "B.Tech",
      branch: "CS",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert using MongoDB native driver
    const result = await collection.insertOne(sampleStudent);
    console.log('Sample student inserted:', result.insertedId);

    // Verify the insertion
    const insertedStudent = await collection.findOne({ studentId: "CSB.TECH002" });
    console.log('Inserted student details:');
    console.log(`Student ID: ${insertedStudent.studentId}`);
    console.log(`Name: ${insertedStudent.firstName} ${insertedStudent.lastName}`);
    console.log(`Email: ${insertedStudent.email}`);
    console.log(`Phone: ${insertedStudent.mobileNumber}`);

    await mongoose.disconnect();
    console.log('Database connection closed');

  } catch (error) {
    console.error('Error creating sample student:', error);
  }
}

createSampleStudent();