import mongoose from 'mongoose';
import Student from '../models/StudentManagement.js';
import FeeSummary from '../models/FeeSummary.js';
import AcademicDepartment from '../models/AcademicDepartment.js';
import Stream from '../models/Stream.js';

async function populateFeeSummaries() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/erp-neitem', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    // Get all students with populated department and stream
    const students = await Student.find({})
      .populate('department')
      .populate('stream')
      .limit(50); // Start with 50 students for testing

    console.log(`Found ${students.length} students`);

    let processed = 0;
    let created = 0;
    let updated = 0;

    for (const student of students) {
      try {
        // Calculate basic fee summary data
        // Note: In real scenario, you'd calculate actual fees from fee heads and payments
        // For now, we'll use placeholder values or existing student fee data if available

        const feeSummaryData = {
          studentId: student._id,
          studentName: `${student.firstName} ${student.middleName ? student.middleName + ' ' : ''}${student.lastName}`,
          casteCategory: student.casteCategory || 'General',
          stream: student.stream?.name || student.stream || 'B.Tech',
          department: student.department?.name || student.department || 'Unknown',
          totalFees: student.totalFees || 0,
          paidFees: student.paidFees || 0,
          pendingFees: student.pendingFees || 0,
          lastUpdated: new Date()
        };

        // Check if fee summary already exists
        const existingSummary = await FeeSummary.findOne({ studentId: student._id });

        if (existingSummary) {
          // Update existing
          await FeeSummary.findOneAndUpdate(
            { studentId: student._id },
            feeSummaryData,
            { new: true }
          );
          updated++;
          console.log(`Updated fee summary for ${feeSummaryData.studentName}`);
        } else {
          // Create new
          await FeeSummary.create(feeSummaryData);
          created++;
          console.log(`Created fee summary for ${feeSummaryData.studentName}`);
        }

        processed++;

        // Progress indicator
        if (processed % 10 === 0) {
          console.log(`Processed ${processed}/${students.length} students`);
        }

      } catch (err) {
        console.error(`Error processing student ${student._id}:`, err.message);
      }
    }

    console.log(`\nSummary:`);
    console.log(`Total processed: ${processed}`);
    console.log(`Created: ${created}`);
    console.log(`Updated: ${updated}`);

    // Verify the data
    const totalSummaries = await FeeSummary.countDocuments();
    console.log(`Total fee summaries in database: ${totalSummaries}`);

    // Show a sample
    const sample = await FeeSummary.findOne().limit(1);
    if (sample) {
      console.log('\nSample fee summary:');
      console.log(JSON.stringify(sample.toObject(), null, 2));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

populateFeeSummaries();