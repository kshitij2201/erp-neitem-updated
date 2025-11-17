import mongoose from 'mongoose';
import AcademicCalendar from './models/AcademicCalendar.js';

async function checkCalendars() {
  try {
    await mongoose.connect('mongodb://localhost:27017/erp-neitem', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const calendars = await AcademicCalendar.find({}).limit(5);
    console.log(`Found ${calendars.length} calendars`);
    
    calendars.forEach((cal, index) => {
      console.log(`Calendar ${index + 1}:`);
      console.log(`  ID: ${cal._id}`);
      console.log(`  Title: ${cal.title}`);
      console.log(`  Topics count: ${cal.topics?.length || 0}`);
      if (cal.topics && cal.topics.length > 0) {
        console.log('  Topics:');
        cal.topics.forEach((t, i) => {
          console.log(`    ${i + 1}. _id: ${t._id}, name: ${t.topicName}`);
        });
      }
      console.log('---');
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkCalendars();