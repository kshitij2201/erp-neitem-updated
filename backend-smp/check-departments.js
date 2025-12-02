import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function fixDepartments() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const AcademicDepartment = mongoose.model('AcademicDepartment', new mongoose.Schema({
      name: String,
      stream: String,
      code: String
    }));

    // Update all departments to have proper stream names
    // MBA department should have stream "MBA"
    // All others should have stream "B.Tech"
    await AcademicDepartment.updateOne(
      { name: 'MBA' },
      { stream: 'MBA' }
    );

    // Update all other departments to B.Tech
    await AcademicDepartment.updateMany(
      { name: { $ne: 'MBA' } },
      { stream: 'B.Tech' }
    );

    console.log('Updated department streams');

    // Now check the updated departments
    const departments = await AcademicDepartment.find({});
    console.log('\n=== Updated Academic Departments ===');
    departments.forEach((dept, index) => {
      console.log(`${index + 1}. Name: "${dept.name}", Stream: "${dept.stream}", Code: "${dept.code}"`);
    });

    // Group by stream
    const btechDepts = departments.filter(d => d.stream === 'B.Tech');
    const mbaDepts = departments.filter(d => d.stream === 'MBA');

    console.log('\n=== B.Tech Departments ===');
    btechDepts.forEach(dept => console.log(`- ${dept.name}`));

    console.log('\n=== MBA Departments ===');
    mbaDepts.forEach(dept => console.log(`- ${dept.name}`));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixDepartments();