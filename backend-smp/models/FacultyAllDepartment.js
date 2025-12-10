import mongoose from "mongoose";

const facultyAllDepartmentSchema = new mongoose.Schema({
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Faculty",
    required: true,
    unique: true
  },
  facultyName: {
    type: String,
    required: true
  },
  employeeId: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const FacultyAllDepartment = mongoose.model("FacultyAllDepartment", facultyAllDepartmentSchema);

export default FacultyAllDepartment;