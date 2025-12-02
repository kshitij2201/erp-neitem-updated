import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function fixStreamNames() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const Stream = mongoose.model('Stream', new mongoose.Schema({
      name: String,
      code: String
    }));

    // Update "B-tech" to "B.Tech"
    const result1 = await Stream.updateOne(
      { name: 'B-tech' },
      { name: 'B.Tech' }
    );

    console.log(`Updated ${result1.modifiedCount} stream(s) from "B-tech" to "B.Tech"`);

    // Verify the changes
    const streams = await Stream.find({});
    console.log('\n=== Updated Streams ===');
    streams.forEach((stream, index) => {
      console.log(`${index + 1}. ID: ${stream._id}, Name: "${stream.name}", Code: "${stream.code}"`);
    });

    console.log('\n✅ Stream names fixed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixStreamNames();