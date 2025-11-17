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
        "teacher",
      ],
    },
  ],
  department: { type: String }, // Department for HOD announcements
  semester: { type: String }, // Semester for Teacher/CC announcements (Sem-1, Sem-2, etc.)
  createdBy: { type: String }, // Role of the creator (hod, principal, teacher, cc, etc.)
  createdById: { type: String }, // Optional: ID of the user who created the announcement
  date: { type: Date, default: Date.now },
});

export default mongoose.model(
  "Announcement",
  announcementSchema,
  "announcements"
);
