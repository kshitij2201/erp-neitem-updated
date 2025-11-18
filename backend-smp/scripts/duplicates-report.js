/*
  Generates a JSON report of duplicates and records missing SERIESCODE.
  Usage:
    node backend-smp/scripts/duplicates-report.js

  Requires MONGO_URI env var or will use default localhost connection string.
*/

import mongoose from 'mongoose';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend-smp directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGO = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/yourdb';

console.log('Using MONGO_URI:', MONGO ? MONGO.substring(0, 50) + '...' : 'Not found');

const bookSchema = new mongoose.Schema({}, { strict: false });
const Book = mongoose.model('Book_report', bookSchema, 'books');

async function run() {
  try {
    await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('Connection string (first 100 chars):', MONGO.substring(0, 100));
    process.exit(1);
  }

  const report = { generatedAt: new Date().toISOString(), duplicatesInSameSeries: [], accnoAcrossSeries: [], missingSeriesCode: [] };

  // Duplicates within the same series (full list)
  const pipelineSameSeries = [
    { $match: { ACCNO: { $exists: true, $ne: null }, SERIESCODE: { $exists: true, $ne: null } } },
    { $group: { _id: { series: '$SERIESCODE', accno: '$ACCNO' }, count: { $sum: 1 }, docs: { $push: { _id: '$_id', doc: '$$ROOT' } } } },
    { $match: { count: { $gt: 1 } } },
    { $project: { series: '$_id.series', accno: '$_id.accno', count: 1, docs: 1, _id: 0 } }
  ];

  const sameSeriesDuplicates = await Book.aggregate(pipelineSameSeries).allowDiskUse(true);
  report.duplicatesInSameSeries = sameSeriesDuplicates;

  // ACCNO repeated across series
  const pipelineAcrossSeries = [
    { $match: { ACCNO: { $exists: true, $ne: null } } },
    { $group: { _id: { accno: '$ACCNO', series: '$SERIESCODE' }, count: { $sum: 1 } } },
    { $group: { _id: '$_id.accno', seriesCount: { $sum: 1 }, entries: { $push: '$_id.series' } } },
    { $match: { seriesCount: { $gt: 1 } } },
    { $project: { accno: '$_id', seriesCount: 1, entries: 1, _id: 0 } }
  ];

  const acrossSeries = await Book.aggregate(pipelineAcrossSeries).allowDiskUse(true);
  report.accnoAcrossSeries = acrossSeries;

  // Records missing or empty SERIESCODE
  const missingSeries = await Book.find({ $or: [{ SERIESCODE: { $exists: false } }, { SERIESCODE: null }, { SERIESCODE: '' }] }).limit(1000).lean();
  report.missingSeriesCode = { count: missingSeries.length, examples: missingSeries.slice(0, 50) };

  const outPath = './backend-smp/scripts/duplicates-report.json';
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log('Report written to', outPath);

  await mongoose.disconnect();
  console.log('Done');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
