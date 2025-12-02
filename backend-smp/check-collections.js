import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkAllCollections() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n=== Available Collections ===');
    collections.forEach(col => console.log(`- ${col.name}`));

    // Check if there's a Stream collection
    const Stream = mongoose.model('Stream', new mongoose.Schema({
      name: String,
      code: String
    }));

    try {
      const streams = await Stream.find({});
      console.log('\n=== Stream Collection ===');
      streams.forEach((stream, index) => {
        console.log(`${index + 1}. ID: ${stream._id}, Name: "${stream.name}", Code: "${stream.code}"`);
      });
    } catch (error) {
      console.log('\nStream collection not found or error:', error.message);
    }

    // Check AcademicYear collection
    const AcademicYear = mongoose.model('AcademicYear', new mongoose.Schema({
      name: String,
      code: String
    }));

    try {
      const years = await AcademicYear.find({});
      console.log('\n=== AcademicYear Collection ===');
      years.forEach((year, index) => {
        console.log(`${index + 1}. ID: ${year._id}, Name: "${year.name}", Code: "${year.code}"`);
      });
    } catch (error) {
      console.log('\nAcademicYear collection not found or error:', error.message);
    }

    // Check the raw department data again
    const AcademicDepartment = mongoose.model('AcademicDepartment', new mongoose.Schema({
      name: String,
      stream: mongoose.Schema.Types.Mixed, // Can be string or ObjectId
      code: String
    }));

    const departments = await AcademicDepartment.find({});
    console.log('\n=== Raw Department Data ===');
    departments.forEach((dept, index) => {
      console.log(`${index + 1}. Name: "${dept.name}", Stream: ${JSON.stringify(dept.stream)}, Code: "${dept.code}"`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAllCollections();