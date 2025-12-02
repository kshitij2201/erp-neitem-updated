const mongoose = require('mongoose');
const FeeHead = require('./models/FeeHead');

async function addMBASampleFees() {
    try {
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/erp-neitem', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');

        // Sample MBA fees data
        const mbaFees = [
            {
                feeType: 'Admission Fee',
                amount: 50000,
                stream: 'MBA',
                branch: 'Finance',
                batch: '2023-2025',
                year: '1st Year',
                semester: 'Semester 1',
                category: 'Admission'
            },
            {
                feeType: 'Tuition Fee',
                amount: 75000,
                stream: 'MBA',
                branch: 'Finance',
                batch: '2023-2025',
                year: '1st Year',
                semester: 'Semester 1',
                category: 'Tuition'
            },
            {
                feeType: 'Development Fee',
                amount: 15000,
                stream: 'MBA',
                branch: 'Finance',
                batch: '2023-2025',
                year: '1st Year',
                semester: 'Semester 1',
                category: 'Development'
            },
            {
                feeType: 'Library Fee',
                amount: 5000,
                stream: 'MBA',
                branch: 'Finance',
                batch: '2023-2025',
                year: '1st Year',
                semester: 'Semester 1',
                category: 'Library'
            },
            {
                feeType: 'Exam Fee',
                amount: 2000,
                stream: 'MBA',
                branch: 'Finance',
                batch: '2023-2025',
                year: '1st Year',
                semester: 'Semester 1',
                category: 'Exam'
            },
            {
                feeType: 'Admission Fee',
                amount: 50000,
                stream: 'MBA',
                branch: 'Marketing',
                batch: '2023-2025',
                year: '1st Year',
                semester: 'Semester 1',
                category: 'Admission'
            },
            {
                feeType: 'Tuition Fee',
                amount: 75000,
                stream: 'MBA',
                branch: 'Marketing',
                batch: '2023-2025',
                year: '1st Year',
                semester: 'Semester 1',
                category: 'Tuition'
            },
            {
                feeType: 'Development Fee',
                amount: 15000,
                stream: 'MBA',
                branch: 'Marketing',
                batch: '2023-2025',
                year: '1st Year',
                semester: 'Semester 1',
                category: 'Development'
            },
            {
                feeType: 'Library Fee',
                amount: 5000,
                stream: 'MBA',
                branch: 'Marketing',
                batch: '2023-2025',
                year: '1st Year',
                semester: 'Semester 1',
                category: 'Library'
            },
            {
                feeType: 'Exam Fee',
                amount: 2000,
                stream: 'MBA',
                branch: 'Marketing',
                batch: '2023-2025',
                year: '1st Year',
                semester: 'Semester 1',
                category: 'Exam'
            }
        ];

        // Insert the MBA fees
        const insertedFees = await FeeHead.insertMany(mbaFees);
        console.log(`Successfully added ${insertedFees.length} MBA fees to database`);

        // Verify the insertion
        const mbaFeesCount = await FeeHead.countDocuments({ stream: 'MBA' });
        console.log(`Total MBA fees in database: ${mbaFeesCount}`);

        // Show sample MBA fees
        const sampleMBAFees = await FeeHead.find({ stream: 'MBA' }).limit(3);
        console.log('\nSample MBA fees added:');
        sampleMBAFees.forEach(fee => {
            console.log(`  - ${fee.feeType}: ₹${fee.amount} (${fee.branch}, ${fee.year})`);
        });

    } catch (error) {
        console.error('Error adding MBA fees:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
}

addMBASampleFees();