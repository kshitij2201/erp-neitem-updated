import mongoose from 'mongoose';

async function populateStudentSemesters() {
  try {
    await mongoose.connect('mongodb://localhost:27017/erp');

    const Student = mongoose.model('student');
    const Semester = mongoose.model('Semester');

    // Find or create semester 1
    let semester1 = await Semester.findOne({ number: 1 });
    if (!semester1) {
      console.log('Semester 1 not found. Creating it...');
      semester1 = new Semester({ number: 1, subjects: [] });
      await semester1.save();
    }

    // Update students without semester
    const result = await Student.updateMany(
      { semester: { $exists: false } },
      { $set: { semester: semester1._id } }
    );

    console.log(`Updated ${result.modifiedCount} students with semester 1`);

    // Check current state
    const totalStudents = await Student.countDocuments();
    const studentsWithSemester = await Student.countDocuments({ semester: { $exists: true } });

    console.log(`Total students: ${totalStudents}`);
    console.log(`Students with semester: ${studentsWithSemester}`);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

populateStudentSemesters();