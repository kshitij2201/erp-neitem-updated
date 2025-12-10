const mongoose = require('mongoose');
require('dotenv').config();

// Connect to database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/library', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to database');

  try {
    // Get the Book model
    const Book = require('./models/Book');

    // Find books with invalid QUANTITY values
    const invalidBooks = await Book.find({
      $or: [
        { QUANTITY: 'NaN' },
        { QUANTITY: NaN },
        { QUANTITY: null },
        { QUANTITY: { $exists: false } }
      ]
    });

    console.log('Found', invalidBooks.length, 'books with invalid QUANTITY');

    // Update all invalid books to have QUANTITY = 1
    const result = await Book.updateMany(
      {
        $or: [
          { QUANTITY: 'NaN' },
          { QUANTITY: NaN },
          { QUANTITY: null },
          { QUANTITY: { $exists: false } }
        ]
      },
      { $set: { QUANTITY: 1 } }
    );

    console.log('Updated', result.modifiedCount, 'books');

    // Verify the fix
    const stillInvalid = await Book.find({
      $or: [
        { QUANTITY: 'NaN' },
        { QUANTITY: NaN },
        { QUANTITY: null },
        { QUANTITY: { $exists: false } }
      ]
    });

    console.log('Still invalid books:', stillInvalid.length);

  } catch (error) {
    console.error('Error:', error);
  }

  process.exit(0);
}).catch(err => {
  console.error('Connection error:', err);
  process.exit(1);
});