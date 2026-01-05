const mongoose = require('mongoose');

async function createSampleBook() {
  try {
    await mongoose.connect('mongodb://localhost:27017/erp-neitem', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to database');

    // Access the books collection directly
    const db = mongoose.connection.db;
    const collection = db.collection('books');

    // Clear any existing books
    await collection.deleteMany({});
    console.log('Cleared existing books');

    // Create a sample book with proper QUANTITY field
    const sampleBook = {
      ACCNO: "500",
      AUTHOR: "Test Author",
      TITLENAME: "nayan book",
      "PUBLISHER NAME": "Cengage Learning", 
      CITY: "Test City",
      "PUB.YEAR": "2023",
      PAGES: "300",
      QUANTITY: 5,  // Number type, not string
      AVAILABLE: 5,
      ISSUED: 0,
      STATUS: "PRESENT",
      materialType: "book",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert using MongoDB native driver
    const result = await collection.insertOne(sampleBook);
    console.log('Sample book inserted:', result.insertedId);

    // Verify the insertion
    const insertedBook = await collection.findOne({ ACCNO: "500" });
    console.log('Inserted book details:');
    console.log(`ACCNO: ${insertedBook.ACCNO}`);
    console.log(`TITLENAME: ${insertedBook.TITLENAME}`);
    console.log(`QUANTITY: ${insertedBook.QUANTITY} (type: ${typeof insertedBook.QUANTITY})`);
    console.log(`STATUS: ${insertedBook.STATUS}`);

    await mongoose.disconnect();
    console.log('Database connection closed');

  } catch (error) {
    console.error('Error creating sample book:', error);
  }
}

createSampleBook();