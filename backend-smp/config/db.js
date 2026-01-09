import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // Configure mongoose options
    const options = {
      serverSelectionTimeoutMS: 10000, // Timeout after 10s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      family: 4 // Use IPv4, skip trying IPv6
    };

    await mongoose.connect(process.env.MONGO_URI, options);
    console.log('MongoDB connected ✅');

    // Initialize counters after successful connection
    await initializeCounters();
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
    console.error('Connection string (masked):', process.env.MONGO_URI ? process.env.MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@') : 'NOT FOUND');
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Check your internet connection');
    console.log('2. Verify MongoDB Atlas IP whitelist (add 0.0.0.0/0 to allow all IPs)');
    console.log('3. Ensure database user credentials are correct');
    console.log('4. Check if MongoDB Atlas cluster is running');
    console.log('\nRetrying connection in 5 seconds...\n');
    
    // Retry connection after 5 seconds
    setTimeout(() => {
      console.log('Retrying MongoDB connection...');
      connectDB();
    }, 5000);
  }
};

// Counter initialization function
async function initializeCounters() {
  try {
    // Import Counter model here to avoid circular dependencies
    const Counter = (await import('../models/Counter.js')).default;

    const teachingCounter = await Counter.findOne({ id: "teaching" });
    if (!teachingCounter) {
      await new Counter({ id: "teaching", seq: 1000 }).save();
      console.log("Teaching counter initialized");
    }

    const nonTeachingCounter = await Counter.findOne({ id: "nonTeaching" });
    if (!nonTeachingCounter) {
      await new Counter({ id: "nonTeaching", seq: 1000 }).save();
      console.log("Non-teaching counter initialized");
    }
  } catch (error) {
    console.error("Error initializing counters:", error);
    // Don't exit process for counter initialization errors
  }
}

export default connectDB;
