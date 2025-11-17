import express from "express";
import upload from "../middleware/upload.js";
import File from "../models/File.js";
import {
  uploadFile,
  getFiles,
  getFilesByDepartment,
  downloadFile,
  deleteFile,
  downloadStudentAttendance,
} from "../controllers/fileController.js";
import { protect } from "../middleware/auth.js";
import { protectStudent } from "../middleware/studentAuth.js";

const router = express.Router();

// List all files
router.get("/", getFiles);
// Get files by department (for students)
router.get("/department/:department", getFilesByDepartment);
// Upload a file (protected)
router.post("/", protect, upload.single("file"), uploadFile);
// Download a file
router.get("/download/:id", downloadFile);
// Delete a file (protected)
router.delete("/:id", protect, deleteFile);
// Download student attendance data (protected)
router.get(
  "/student-attendance/:studentId/:subjectId/download",
  protect,
  downloadStudentAttendance
);
// Get files for logged-in student (filtered by their department, semester, and section)
router.get("/student/my-files", protectStudent, async (req, res) => {
  try {
    let studentDepartment, studentSemester, studentSection;
    try {
      await req.user.populate('department', 'name');
      await req.user.populate('semester', 'number');
    } catch (populateError) {
      console.error("Populate error:", populateError);
      // Continue without populated data
    }
    studentDepartment = req.user.department?.name || (req.user.department ? req.user.department.toString() : null);
    studentSemester = req.user.semester?.number?.toString() || (req.user.semester ? req.user.semester.toString() : null);
    studentSection = req.user.section;
    console.log("Student department:", studentDepartment, "semester:", studentSemester, "section:", studentSection);
    if (!studentDepartment || !studentSemester) {
      return res.status(400).json({
        success: false,
        message: "Student department or semester not found",
      });
    }

    const query = {
      uploaderDepartment: { $regex: studentDepartment, $options: "i" },
      semester: studentSemester.toString(),
    };

    if (studentSection) {
      query.$and = [
        {
          $or: [
            { section: "ALL" },
            { section: studentSection }
          ]
        }
      ];
    } else {
      // If no section, only show ALL
      query.section = "ALL";
    }

    console.log("Student query:", JSON.stringify(query, null, 2));
    
    // First, let's see all files in the database
    const allFiles = await File.find({});
    console.log("Total files in database:", allFiles.length);
    allFiles.forEach(file => {
      console.log(`File: ${file.title}, Dept: "${file.uploaderDepartment}", Sem: "${file.semester}", Sec: "${file.section}"`);
    });
    
    const files = await File.find(query)
      .populate("uploaderId", "firstName lastName department")
      .sort({ createdAt: -1 });
    console.log("Found files matching student query:", files.length);
    
    // Debug: Show what files matched
    files.forEach(file => {
      console.log(`Matched file: ${file.title}, Dept: "${file.uploaderDepartment}"`);
    });
    res.json({ success: true, files, department: studentDepartment, semester: studentSemester, section: studentSection });
  } catch (err) {
    console.error("Student files error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
