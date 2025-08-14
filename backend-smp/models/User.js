import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  plainPassword: { type: String, default: "" }, // ⚠️ DEVELOPMENT ONLY - SECURITY RISK
  role: {
    type: String,
    enum: [
      "director",
      "principal",
      "HOD",
      "teaching",
      "nonteaching",
      "non-teaching",
      "cc",
      "facultymanagement",
      "super_admin",
    ],
    required: true,
    Default: "super_admin",
  },
  firstName: { type: String, default: "" },
  lastName: { type: String, default: "" },
  name: { type: String, default: "" },
  employeeId: { type: String, default: "" },
  gender: { type: String, default: "" },
  dateOfBirth: { type: String, default: "" },
  mobile: { type: String, default: "" },
  address: { type: String, default: "" },
  aadhaar: { type: String, default: "" },
  department: { type: String, default: "" },
  designation: { type: String, default: "" },
  dateOfJoining: { type: String, default: "" },
  employmentStatus: {
    type: String,
    enum: ["Probation Period", "Permanent Employee"],
    default: "Probation Period",
  },
  status: { type: String, default: "Active" },
  teachingExperience: { type: Number, default: 0 },
  subjectsTaught: { type: [String], default: [] },
  classIncharge: { type: String, default: "" },
  researchPublications: { type: [String], default: [] },
  technicalSkills: { type: [String], default: [] },
  workExperience: { type: Number, default: 0 },
  type: { type: String },
});

export default mongoose.model("Faculties", UserSchema);
