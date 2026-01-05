const mongoose = require('mongoose');

async function checkSemesters() {
  try {
    await mongoose.connect('mongodb+srv://tarstechnologiesco_db_user:SugaTars@cluster0.rdzpp59.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Connected to DB');

    const Semester = require('./models/Semester.js');
    const semesters = await Semester.find({});
    console.log('Semesters found:', semesters.length);
    console.log('Semesters:', semesters.map(s => ({ number: s.number, _id: s._id })));

    const Stream = require('./models/Stream.js');
    const streams = await Stream.find({});
    console.log('Streams:', streams.map(s => ({ name: s.name, _id: s._id })));

    const AcademicDepartment = require('./models/AcademicDepartment.js');
    const departments = await AcademicDepartment.find({});
    console.log('Departments:', departments.map(d => ({ name: d.name, _id: d._id })));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkSemesters();