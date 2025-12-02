import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function addMBASampleFees(FeeHead) {
  console.log('\n=== Adding Sample MBA Fees ===');

  // Check if MBA fees already exist
  const existingMBAFees = await FeeHead.countDocuments({ stream: 'MBA' });
  if (existingMBAFees > 0) {
    console.log(`MBA fees already exist (${existingMBAFees} fees). Skipping addition.`);
    return;
  }

  // Sample MBA fees data
  const mbaFees = [
    {
      stream: 'MBA',
      branch: 'Finance',
      batch: '2023-2025',
      head: 'Admission Fee',
      amount: 50000
    },
    {
      stream: 'MBA',
      branch: 'Finance',
      batch: '2023-2025',
      head: 'Tuition Fee',
      amount: 75000
    },
    {
      stream: 'MBA',
      branch: 'Finance',
      batch: '2023-2025',
      head: 'Development Fee',
      amount: 15000
    },
    {
      stream: 'MBA',
      branch: 'Finance',
      batch: '2023-2025',
      head: 'Library Fee',
      amount: 5000
    },
    {
      stream: 'MBA',
      branch: 'Finance',
      batch: '2023-2025',
      head: 'Exam Fee',
      amount: 2000
    },
    {
      stream: 'MBA',
      branch: 'Marketing',
      batch: '2023-2025',
      head: 'Admission Fee',
      amount: 50000
    },
    {
      stream: 'MBA',
      branch: 'Marketing',
      batch: '2023-2025',
      head: 'Tuition Fee',
      amount: 75000
    },
    {
      stream: 'MBA',
      branch: 'Marketing',
      batch: '2023-2025',
      head: 'Development Fee',
      amount: 15000
    },
    {
      stream: 'MBA',
      branch: 'Marketing',
      batch: '2023-2025',
      head: 'Library Fee',
      amount: 5000
    },
    {
      stream: 'MBA',
      branch: 'Marketing',
      batch: '2023-2025',
      head: 'Exam Fee',
      amount: 2000
    }
  ];

  try {
    const insertedFees = await FeeHead.insertMany(mbaFees);
    console.log(`Successfully added ${insertedFees.length} MBA fees to database`);
  } catch (error) {
    console.error('Error adding MBA fees:', error);
  }
}

async function checkFeesInDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const FeeHead = mongoose.model('FeeHead', new mongoose.Schema({
      stream: String,
      branch: String,
      batch: String,
      head: String,
      amount: Number
    }));

    const fees = await FeeHead.find({});
    console.log('\n=== All Fees in Database ===');
    console.log(`Total fees found: ${fees.length}`);

    // Group by stream
    const feesByStream = {};
    fees.forEach(fee => {
      if (!feesByStream[fee.stream]) {
        feesByStream[fee.stream] = [];
      }
      feesByStream[fee.stream].push(fee);
    });

    console.log('\n=== Fees by Stream ===');
    Object.keys(feesByStream).forEach(stream => {
      const streamFees = feesByStream[stream];
      console.log(`\n${stream} (${streamFees.length} fees):`);
      const branches = [...new Set(streamFees.map(f => f.branch))];
      console.log(`Branches: ${branches.join(', ')}`);

      // Show sample fees
      if (streamFees.length > 0) {
        console.log('Sample fees:');
        streamFees.slice(0, 3).forEach(fee => {
          console.log(`  - ${fee.head}: ₹${fee.amount} (${fee.branch}, ${fee.batch})`);
        });
        if (streamFees.length > 3) {
          console.log(`  ... and ${streamFees.length - 3} more`);
        }
      }
    });

    // Add MBA fees if they don't exist
    await addMBASampleFees(FeeHead);

    // Check fees again after addition
    const updatedFees = await FeeHead.find({});
    console.log('\n=== Updated Fees Count ===');
    console.log(`Total fees after update: ${updatedFees.length}`);

    const updatedFeesByStream = {};
    updatedFees.forEach(fee => {
      if (!updatedFeesByStream[fee.stream]) {
        updatedFeesByStream[fee.stream] = [];
      }
      updatedFeesByStream[fee.stream].push(fee);
    });

    Object.keys(updatedFeesByStream).forEach(stream => {
      console.log(`${stream}: ${updatedFeesByStream[stream].length} fees`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkFeesInDatabase();