import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkStreamsAndDepartments() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Check streams
    const AcademicStream = mongoose.model('AcademicStream', new mongoose.Schema({
      name: String,
      code: String
    }));

    const streams = await AcademicStream.find({});
    console.log('\n=== Academic Streams ===');
    streams.forEach((stream, index) => {
      console.log(`${index + 1}. ID: ${stream._id}, Name: "${stream.name}", Code: "${stream.code}"`);
    });

    // Check departments with populated stream
    const AcademicDepartment = mongoose.model('AcademicDepartment', new mongoose.Schema({
      name: String,
      stream: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicStream' },
      code: String
    }));

    const departments = await AcademicDepartment.find({}).populate('stream');
    console.log('\n=== Academic Departments (with populated streams) ===');
    departments.forEach((dept, index) => {
      const streamName = dept.stream ? dept.stream.name : 'No stream';
      console.log(`${index + 1}. Name: "${dept.name}", Stream: "${streamName}", Code: "${dept.code}"`);
    });

    // Find the problematic MBA entry
    const mbaDept = departments.find(d => d.name === 'MBA');
    if (mbaDept) {
      console.log('\n=== MBA Department Details ===');
      console.log(`Name: ${mbaDept.name}`);
      console.log(`Stream Object: ${JSON.stringify(mbaDept.stream)}`);
      console.log(`This should probably be a B.Tech branch instead of MBA`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStreamsAndDepartments();