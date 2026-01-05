import mongoose from 'mongoose';
import Stream from './models/Stream.js';
import AcademicDepartment from './models/AcademicDepartment.js';

async function createDepartments() {
  try {
    await mongoose.connect('mongodb+srv://tarstechnologiesco_db_user:SugaTars@cluster0.rdzpp59.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Connected to DB');

    // Check existing streams
    const existingStreams = await Stream.find({});
    console.log('Existing streams:', existingStreams.map(s => ({ name: s.name, _id: s._id })));

    // Find B.Tech and MBA streams
    const btechStream = existingStreams.find(s => s.name === 'B.Tech' || s.name === 'BTech');
    const mbaStream = existingStreams.find(s => s.name === 'MBA');

    if (!btechStream) {
      console.log('B.Tech stream not found. Please create streams first.');
      process.exit(1);
    }

    if (!mbaStream) {
      console.log('MBA stream not found. Please create streams first.');
      process.exit(1);
    }

    console.log('Found B.Tech stream:', btechStream.name, btechStream._id);
    console.log('Found MBA stream:', mbaStream.name, mbaStream._id);

    // Check existing departments
    const existingDepartments = await AcademicDepartment.find({}).populate('stream', 'name');
    console.log('Existing departments:', existingDepartments.map(d => ({ name: d.name, stream: d.stream?.name, streamId: d.stream?._id })));

    // B.Tech departments
    const btechDepartments = [
      'CS',
      'Electrical',
      'Mechanical',
      'Civil',
      'CSE&AIML'
    ];

    // MBA departments
    const mbaDepartments = [
      'MBA'
    ];

    const departmentsToCreate = [];

    // Check and create B.Tech departments
    for (const deptName of btechDepartments) {
      const exists = existingDepartments.find(d => d.name === deptName && d.stream && d.stream._id.toString() === btechStream._id.toString());
      if (!exists) {
        departmentsToCreate.push({
          name: deptName,
          stream: btechStream._id
        });
      }
    }

    // Check and create MBA departments
    for (const deptName of mbaDepartments) {
      const exists = existingDepartments.find(d => d.name === deptName && d.stream && d.stream._id.toString() === mbaStream._id.toString());
      if (!exists) {
        departmentsToCreate.push({
          name: deptName,
          stream: mbaStream._id
        });
      }
    }

    if (departmentsToCreate.length > 0) {
      const created = await AcademicDepartment.insertMany(departmentsToCreate);
      console.log('Created departments:', created.map(d => ({ name: d.name, stream: d.stream })));
    } else {
      console.log('All departments already exist');
    }

    // Final check
    const allDepartments = await AcademicDepartment.find({}).populate('stream', 'name');
    console.log('Final departments:', allDepartments.map(d => ({ name: d.name, stream: d.stream?.name })));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

createDepartments();