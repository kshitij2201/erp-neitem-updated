import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected ✅');

    // Initialize counters after successful connection
    await initializeCounters();
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1); // Exit the process with failure if connection fails
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
