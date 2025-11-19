/*
  Audit script for ACCNO duplicates within the same SERIESCODE or globally.
  Run with: node backend-smp/scripts/audit-accno-duplicates.js

  It expects your app's MONGO_URI environment variable to be set (or you can hardcode for quick runs).
*/

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/yourdb';

const bookSchema = new mongoose.Schema({}, { strict: false });
const Book = mongoose.model('Book_audit', bookSchema, 'books'); // use 'books' collection explicitly

async function run() {
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to', MONGO);

  // Find duplicates within same series
  const pipelineSameSeries = [
    { $match: { ACCNO: { $exists: true, $ne: null }, SERIESCODE: { $exists: true, $ne: null } } },
    { $group: { _id: { series: '$SERIESCODE', accno: '$ACCNO' }, count: { $sum: 1 }, docs: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } },
    { $project: { series: '$_id.series', accno: '$_id.accno', count: 1, docs: 1, _id: 0 } },
    { $limit: 100 }
  ];

  const sameSeriesDuplicates = await Book.aggregate(pipelineSameSeries).allowDiskUse(true);
  console.log('\nDuplicates inside the same SERIESCODE (sample up to 100):', sameSeriesDuplicates.length);
  sameSeriesDuplicates.forEach(d => console.log(`Series=${d.series} ACCNO=${d.accno} count=${d.count} ids=${d.docs.slice(0,5).join(',')}`));

  // Find accno repeated across multiple series
  const pipelineAcrossSeries = [
    { $match: { ACCNO: { $exists: true, $ne: null } } },
    { $group: { _id: { accno: '$ACCNO', series: '$SERIESCODE' }, count: { $sum: 1 } } },
    { $group: { _id: '$_id.accno', seriesCount: { $sum: 1 }, entries: { $push: '$_id.series' } } },
    { $match: { seriesCount: { $gt: 1 } } },
    { $project: { accno: '$_id', seriesCount: 1, entries: 1, _id: 0 } },
    { $limit: 100 }
  ];

  const acrossSeries = await Book.aggregate(pipelineAcrossSeries).allowDiskUse(true);
  console.log('\nACCNO present in multiple SERIESCODE values (sample up to 100):', acrossSeries.length);
  acrossSeries.forEach(d => console.log(`ACCNO=${d.accno} seriesCount=${d.seriesCount} series=${d.entries.join(',')}`));

  await mongoose.disconnect();
  console.log('\nDone.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
