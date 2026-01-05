const mongoose = require('mongoose');
const Student = require('./models/StudentManagement.js');

async function updateExistingStudents() {
  try {
    await mongoose.connect('mongodb://localhost:27017/erp');
    console.log('Connected to MongoDB');

    const result = await Student.updateMany(
      { totalFees: { $exists: false } },
      {
        $set: {
          totalFees: 0,
          paidFees: 0,
          pendingFees: 0
        }
      }
    );

    console.log('Updated', result.modifiedCount, 'students');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateExistingStudents();