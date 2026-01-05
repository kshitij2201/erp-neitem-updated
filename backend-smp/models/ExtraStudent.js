import mongoose from "mongoose";

const extraStudentSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  middleName: {
    type: String,
  },
  lastName: {
    type: String,
    required: true,
  },
  fatherName: {
    type: String,
  },
  motherName: {
    type: String,
  },
  mobileNumber: {
    type: String,
  },
  program: {
    type: String,
    required: true,
  },
  department: {
    type: String,
    required: true,
  },
  currentSemester: {
    type: Number,
    required: true,
  },
  enrollmentYear: {
    type: String,
    required: true,
  },
  academicStatus: {
    type: String,
    default: "Active",
  },
  email: {
    type: String,
  },
  gender: {
    type: String,
    enum: ["Male", "Female", "Other"],
  },
  casteCategory: {
    type: String,
  },
  subCaste: {
    type: String,
  },
  dateOfBirth: {
    type: Date,
  },
  nationality: {
    type: String,
  },
  placeOfBirth: {
    type: String,
  },
  schoolAttended: {
    type: String,
  },
  nameOfInstitute: {
    type: String,
  },
  admissionDate: {
    type: Date,
  },
  studentId: {
    type: String,
    unique: true,
  },
  photo: {
    type: String,
  },
  totalFees: {
    type: Number,
    default: 0,
  },
  paidFees: {
    type: Number,
    default: 0,
  },
  pendingFees: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

export default mongoose.model("ExtraStudent", extraStudentSchema);