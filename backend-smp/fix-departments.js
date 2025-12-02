import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function fixDepartmentData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get the B.Tech stream ID
    const Stream = mongoose.model('Stream', new mongoose.Schema({
      name: String,
      code: String
    }));

    const btechStream = await Stream.findOne({ name: 'B-tech' });
    if (!btechStream) {
      console.error('B.Tech stream not found!');
      process.exit(1);
    }

    console.log(`Found B.Tech stream: ${btechStream._id} - "${btechStream.name}"`);

    // Update the MBA department to be associated with B.Tech stream
    const AcademicDepartment = mongoose.model('AcademicDepartment', new mongoose.Schema({
      name: String,
      stream: String,
      code: String
    }));

    const result = await AcademicDepartment.updateOne(
      { name: 'MBA' },
      { stream: btechStream._id.toString() }
    );

    console.log(`Updated ${result.modifiedCount} department(s)`);

    // Verify the fix
    const departments = await AcademicDepartment.find({});
    console.log('\n=== Updated Department Data ===');
    departments.forEach((dept, index) => {
      console.log(`${index + 1}. Name: "${dept.name}", Stream: "${dept.stream}"`);
    });

    // Show B.Tech departments
    const btechDepts = departments.filter(d => d.stream === btechStream._id.toString());
    console.log('\n=== B.Tech Departments (after fix) ===');
    btechDepts.forEach(dept => console.log(`- ${dept.name}`));

    // Show MBA departments
    const mbaStream = await Stream.findOne({ name: 'MBA' });
    const mbaDepts = departments.filter(d => d.stream === mbaStream._id.toString());
    console.log('\n=== MBA Departments (after fix) ===');
    mbaDepts.forEach(dept => console.log(`- ${dept.name}`));

    console.log('\n✅ Database fix completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixDepartmentData();