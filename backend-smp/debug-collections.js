import mongoose from 'mongoose';

async function checkAllCollections() {
  try {
    await mongoose.connect('mongodb://localhost:27017/neitemerp');
    console.log('Connected to MongoDB');
    
    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nAll collections in database:');
    
    for (const collection of collections) {
      const collectionName = collection.name;
      const count = await mongoose.connection.db.collection(collectionName).countDocuments();
      console.log(`- ${collectionName}: ${count} documents`);
      
      // If it looks like a student collection, show sample
      if (collectionName.toLowerCase().includes('student')) {
        const sample = await mongoose.connection.db.collection(collectionName).findOne();
        console.log('  Sample document:', sample ? Object.keys(sample) : 'No documents');
      }
    }
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAllCollections();