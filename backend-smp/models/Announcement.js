import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  tag: { type: String, required: true },
  endDate: { type: Date, required: true },
  visibleTo: [
    {
      type: String,
      enum: [
        "student",
        "teaching_staff",
        "non_teaching_staff",
        "hod",
        "principal",
        "cc",
      ],
    },
  ],
  department: { type: String }, // Department for HOD announcements
  createdBy: { type: String }, // Role of the creator (hod, principal, etc.)
  date: { type: Date, default: Date.now },
});

export default mongoose.model(
  "Announcement",
  announcementSchema,
  "announcements"
);
