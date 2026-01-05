import mongoose from 'mongoose';
import Semester from './models/Semester.js';

async function createSemesters() {
  try {
    await mongoose.connect('mongodb+srv://tarstechnologiesco_db_user:SugaTars@cluster0.rdzpp59.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Connected to DB');

    // Check existing semesters
    const existingSemesters = await Semester.find({});
    console.log('Existing semesters:', existingSemesters.map(s => ({ number: s.number, _id: s._id })));

    // Create semesters 1-8 if they don't exist
    const semestersToCreate = [];
    for (let i = 1; i <= 8; i++) {
      const exists = existingSemesters.find(s => s.number === i);
      if (!exists) {
        semestersToCreate.push({ number: i, subjects: [] });
      }
    }

    if (semestersToCreate.length > 0) {
      const created = await Semester.insertMany(semestersToCreate);
      console.log('Created semesters:', created.map(s => ({ number: s.number, _id: s._id })));
    } else {
      console.log('All semesters already exist');
    }

    // Final check
    const allSemesters = await Semester.find({});
    console.log('Final semesters:', allSemesters.map(s => ({ number: s.number, _id: s._id })));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

createSemesters();