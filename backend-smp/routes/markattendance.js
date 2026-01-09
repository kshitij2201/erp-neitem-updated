import express from "express";
import mongoose from "mongoose";
import Faculty from "../models/faculty.js";
import Student from "../models/student.js";
import AdminSubject from "../models/AdminSubject.js";
import AcademicDepartment from "../models/AcademicDepartment.js";
import Semester from "../models/Semester.js";
import Attendance from "../models/attendance.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// GET /api/faculty/markattendance/subjects - Get subjects for the authenticated faculty
router.get("/subjects", protect, async (req, res) => {
  try {
    console.log("[GetFacultySubjects] Getting subjects for faculty:", req.user.employeeId);

    // Find the faculty and populate subjectsTaught
    const faculty = await Faculty.findById(req.user._id).populate({
      path: "subjectsTaught",
      populate: [
        { path: "department", model: "AcademicDepartment" }
      ],
    });

    if (!faculty) {
      return res.status(404).json({ 
        success: false, 
        message: "Faculty not found" 
      });
    }

    console.log("[GetFacultySubjects] Faculty found:", faculty.firstName, "Subjects:", faculty.subjectsTaught.length);

    // Transform AdminSubject data for frontend compatibility
    const transformedSubjects = faculty.subjectsTaught.map(subject => {
      if (subject && subject.name) {
        return {
          ...subject.toObject(),
          // Keep semester field for display but also add year for backward compatibility
          semester: subject.semester, // AdminSubject stores semester as string
          year: subject.semester, // Also provide as year for compatibility
          section: subject.section || "A", // Default section if not available
        };
      }
      return subject;
    });

    console.log("[GetFacultySubjects] Transformed subjects:", transformedSubjects.length);

    res.json({ 
      success: true, 
      data: transformedSubjects || [],
      message: "Subjects retrieved successfully"
    });
  } catch (error) {
    console.error("[GetFacultySubjects] Error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      error: error.toString()
    });
  }
});

// POST /api/faculty/markattendance
router.post("/", async (req, res) => {
  try {
    const { subjectId, facultyId, selectedStudents = [], date } = req.body;
    
    console.log("[MarkAttendance] Request body:", { subjectId, facultyId, selectedStudents: selectedStudents.length, date });
    
    if (!subjectId || !facultyId) {
      return res.status(400).json({
        success: false,
        message: "subjectId and facultyId are required",
      });
    }

    // Find the subject with populated department info
    const adminSubject = await AdminSubject.findById(subjectId)
      .populate('department');
      
    if (!adminSubject) {
      return res.status(404).json({ 
        success: false, 
        message: "Subject not found" 
      });
    }

    console.log("[MarkAttendance] Subject found:", {
      name: adminSubject.name,
      department: adminSubject.department
    });

    // Find faculty
    const faculty = (await Faculty.findOne({ employeeId: facultyId })) || 
                   (await Faculty.findById(facultyId));
    if (!faculty) {
      return res.status(404).json({ 
        success: false, 
        message: "Faculty not found" 
      });
    }

    const today = date ? new Date(date) : new Date();
    today.setHours(0, 0, 0, 0);

    // Check if attendance is already marked for today
    const existingAttendance = await Attendance.findOne({
      subject: subjectId,
      faculty: faculty._id,
      date: today,
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: "Attendance has already been marked for today for this subject",
        alreadyMarked: true,
      });
    }

    // Find students based on subject's department (AdminSubject only has name and department)
    let allStudents = [];
    
    // Match by department if available
    if (adminSubject.department) {
      let departmentId = null;
      
      if (typeof adminSubject.department === 'object' && adminSubject.department._id) {
        // If department is populated object with _id
        departmentId = adminSubject.department._id;
      } else if (typeof adminSubject.department === 'object' && adminSubject.department.name) {
        // If department is populated object, find by name
        const academicDept = await AcademicDepartment.findOne({ 
          name: { $regex: new RegExp(`^${adminSubject.department.name}$`, 'i') }
        });
        if (academicDept) {
          departmentId = academicDept._id;
        }
      } else if (mongoose.Types.ObjectId.isValid(adminSubject.department)) {
        // If department is already an ObjectId
        departmentId = adminSubject.department;
      } else if (typeof adminSubject.department === 'string') {
        // If department is string name, find the department ObjectId
        const academicDept = await AcademicDepartment.findOne({ 
          name: { $regex: new RegExp(`^${adminSubject.department}$`, 'i') }
        });
        if (academicDept) {
          departmentId = academicDept._id;
        }
      }

      console.log("[MarkAttendance] Department ID:", departmentId);

      if (departmentId) {
        allStudents = await Student.find({ department: departmentId })
          .select('firstName middleName lastName email studentId enrollmentNumber year section department');
      } else {
        console.log("[MarkAttendance] No valid department found, getting all students");
        allStudents = await Student.find({})
          .select('firstName middleName lastName email studentId enrollmentNumber year section department');
      }
    } else {
      // If no department info, get all students
      allStudents = await Student.find({})
        .select('firstName middleName lastName email studentId enrollmentNumber year section department');
    }
    
    console.log("[MarkAttendance] Students found:", allStudents.length);

    if (!allStudents.length) {
      return res.status(404).json({
        success: false,
        message: `No students found for this subject's department.`,
        subjectInfo: {
          name: adminSubject.name,
          department: adminSubject.department?.name || adminSubject.department || 'N/A'
        }
      });
    }

    // Get department and semester IDs for attendance records
    let departmentId = adminSubject.department?._id || adminSubject.department;
    let semesterId = null;
    
    // Try to find the Semester document for the semester number
    if (adminSubject.semester) {
      const semesterNum = parseInt(adminSubject.semester);
      if (!isNaN(semesterNum)) {
        const semesterDoc = await Semester.findOne({ number: semesterNum });
        if (semesterDoc) {
          semesterId = semesterDoc._id;
        }
      }
    }
    
    // Create default ObjectIds if not available
    if (!departmentId) {
      departmentId = new mongoose.Types.ObjectId();
    }
    if (!semesterId) {
      semesterId = new mongoose.Types.ObjectId();
    }

    // Prepare attendance records - only for selected students
    const { status = "present" } = req.body; // Get status from request, default to "present"
    
    // Filter only selected students
    const studentsToMark = allStudents.filter(student => 
      selectedStudents.includes(student._id.toString())
    );
    
    if (studentsToMark.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No students selected for attendance marking"
      });
    }
    
    const records = studentsToMark.map((student) => ({
      student: student._id,
      studentName: `${student.firstName || ''} ${student.middleName || ''} ${student.lastName || ''}`.trim(),
      subject: adminSubject._id,
      faculty: faculty._id,
      date: today,
      status: status,
      semester: semesterId,
      department: departmentId,
    }));

    await Attendance.insertMany(records);
    
    console.log("[MarkAttendance] Attendance marked successfully for", records.length, "students with status:", status);

    res.json({ 
      success: true, 
      message: `Attendance marked for ${records.length} selected students.`,
      data: {
        markedStudents: records.length,
        status: status,
        subject: {
          name: adminSubject.name,
          department: adminSubject.department?.name || adminSubject.department,
          year: 'All Years', // AdminSubject doesn't have year
          section: 'All Sections' // AdminSubject doesn't have section
        }
      }
    });
  } catch (error) {
    console.error("[MarkAttendance] Error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      error: error.toString()
    });
  }
});

// GET /api/faculty/markattendance/subject-details/:subjectId - Get subject details with department, year, section
router.get("/subject-details/:subjectId", async (req, res) => {
  try {
    const { subjectId } = req.params;
    
    console.log("[GetSubjectDetails] Getting details for subject:", subjectId);

    // Find the subject with populated information
    const adminSubject = await AdminSubject.findById(subjectId)
      .populate('department');
      
    if (!adminSubject) {
      return res.status(404).json({ 
        success: false, 
        message: "Subject not found" 
      });
    }

    // Count students for this subject's department
    let totalStudents = 0;
    if (adminSubject.department) {
      let departmentId = null;
      
      if (typeof adminSubject.department === 'object' && adminSubject.department._id) {
        departmentId = adminSubject.department._id;
      } else if (typeof adminSubject.department === 'object' && adminSubject.department.name) {
        const academicDept = await AcademicDepartment.findOne({ 
          name: { $regex: new RegExp(`^${adminSubject.department.name}$`, 'i') }
        });
        if (academicDept) {
          departmentId = academicDept._id;
        }
      } else if (mongoose.Types.ObjectId.isValid(adminSubject.department)) {
        departmentId = adminSubject.department;
      } else if (typeof adminSubject.department === 'string') {
        const academicDept = await AcademicDepartment.findOne({ 
          name: { $regex: new RegExp(`^${adminSubject.department}$`, 'i') }
        });
        if (academicDept) {
          departmentId = academicDept._id;
        }
      }

      if (departmentId) {
        totalStudents = await Student.countDocuments({ department: departmentId });
      }
    }

    // Return subject details (AdminSubject only has name and department)
    const subjectDetails = {
      _id: adminSubject._id,
      name: adminSubject.name,
      department: adminSubject.department?.name || adminSubject.department || 'Not Specified',
      // Since AdminSubject doesn't have these fields, we'll set defaults
      year: 'All Years',
      section: 'All Sections',
      semester: 'Not Specified',
      totalStudents: totalStudents // Now shows actual count
    };

    console.log("[GetSubjectDetails] Subject details:", subjectDetails);

    res.json({ 
      success: true, 
      data: subjectDetails
    });
  } catch (error) {
    console.error("[GetSubjectDetails] Error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      error: error.toString()
    });
  }
});

// GET /api/faculty/markattendance/students/:subjectId - Get students for a specific subject
router.get("/students/:subjectId", async (req, res) => {
  try {
    const { subjectId } = req.params;
    
    console.log("[GetSubjectStudents] Getting students for subject:", subjectId);

    // Find the subject with populated department info
    const adminSubject = await AdminSubject.findById(subjectId)
      .populate('department');
      
    if (!adminSubject) {
      return res.status(404).json({ 
        success: false, 
        message: "Subject not found" 
      });
    }

    console.log("[GetSubjectStudents] Subject details:", {
      name: adminSubject.name,
      department: adminSubject.department,
      semester: adminSubject.semester
    });

    // Check if subject has semester assigned
    if (!adminSubject.semester) {
      console.log("[GetSubjectStudents] Subject not assigned to a semester");
      return res.json({ 
        success: true, 
        data: [],
        subject: {
          _id: adminSubject._id,
          name: adminSubject.name,
          department: adminSubject.department?.name || adminSubject.department,
          semester: 'Not Assigned',
          year: 'Not Specified',
          section: 'All Sections'
        },
        totalStudents: 0,
        message: "Subject not assigned to a semester. Please assign this subject to a semester in SemesterManager."
      });
    }

    // Calculate target year from AdminSubject semester string (fallback approach)
    let targetYear = null;
    let targetSemesterId = null;
    if (adminSubject.semester) {
      const semesterNum = parseInt(adminSubject.semester);
      if (!isNaN(semesterNum) && semesterNum >= 1 && semesterNum <= 8) {
        // Calculate year from semester number
        targetYear = Math.ceil(semesterNum / 2);
        console.log(`[GetSubjectStudents] Semester ${semesterNum} maps to year ${targetYear}`);
        
        // Try to find Semester document, but don't depend on it
        const semesterDoc = await Semester.findOne({ number: semesterNum });
        if (semesterDoc) {
          targetSemesterId = semesterDoc._id;
          console.log(`[GetSubjectStudents] Found Semester document with ID: ${targetSemesterId}`);
        } else {
          console.log(`[GetSubjectStudents] No Semester document found with number: ${semesterNum}, using year-based filtering`);
        }
      }
    }

    // Get students by department and semester
    let students = [];
    
    // Match by department if available
    if (adminSubject.department) {
      let departmentId = null;
      
      if (typeof adminSubject.department === 'object' && adminSubject.department._id) {
        // If department is populated object with _id
        departmentId = adminSubject.department._id;
      } else if (typeof adminSubject.department === 'object' && adminSubject.department.name) {
        // If department is populated object, find by name
        const academicDept = await AcademicDepartment.findOne({ 
          name: { $regex: new RegExp(`^${adminSubject.department.name}$`, 'i') }
        });
        if (academicDept) {
          departmentId = academicDept._id;
        }
      } else if (mongoose.Types.ObjectId.isValid(adminSubject.department)) {
        // If department is already an ObjectId
        departmentId = adminSubject.department;
      } else if (typeof adminSubject.department === 'string') {
        // If department is string name, find the department ObjectId
        const academicDept = await AcademicDepartment.findOne({ 
          name: { $regex: new RegExp(`^${adminSubject.department}$`, 'i') }
        });
        if (academicDept) {
          departmentId = academicDept._id;
        }
      }

      console.log("[GetSubjectStudents] Department ID:", departmentId);

      if (departmentId) {
        // First try semester-based filtering
        if (targetSemesterId) {
          students = await Student.find({ department: departmentId, semester: targetSemesterId })
            .select('firstName middleName lastName email studentId enrollmentNumber year section department semester')
            .populate('department', 'name')
            .populate('semester', 'number')
            .sort({ firstName: 1, lastName: 1 });
          console.log(`[GetSubjectStudents] Found ${students.length} students by semester filtering`);
        }
        
        // If no students found by semester, try year-based filtering
        if (students.length === 0 && targetYear) {
          students = await Student.find({ department: departmentId, year: targetYear })
            .select('firstName middleName lastName email studentId enrollmentNumber year section department semester')
            .populate('department', 'name')
            .populate('semester', 'number')
            .sort({ firstName: 1, lastName: 1 });
          console.log(`[GetSubjectStudents] Found ${students.length} students by year filtering`);
        }
        
        // Log student details for debugging
        if (students.length > 0) {
          console.log(`[GetSubjectStudents] Sample students:`, students.slice(0, 3).map(s => ({
            name: `${s.firstName} ${s.lastName}`,
            year: s.year,
            semester: s.semester?.number || 'null',
            department: s.department?.name
          })));
        }
      } else {
        console.log("[GetSubjectStudents] No valid department found");
      }
    } else {
      // If no department info, get all students
      students = await Student.find({})
        .select('firstName middleName lastName email studentId enrollmentNumber year section department')
        .populate('department', 'name')
        .sort({ firstName: 1, lastName: 1 });
    }

    // Add computed name field for frontend compatibility
    const studentsWithName = students.map(student => ({
      ...student.toObject(),
      name: `${student.firstName} ${student.middleName ? student.middleName + ' ' : ''}${student.lastName}`.trim()
    }));

    console.log("[GetSubjectStudents] Final result:", {
      subjectName: adminSubject.name,
      semester: adminSubject.semester,
      targetYear: targetYear,
      targetSemesterId: targetSemesterId,
      studentsFound: studentsWithName.length
    });

    // Create appropriate message based on filtering method used
    let message = "";
    if (studentsWithName.length === 0) {
      message = `No students found for semester ${adminSubject.semester} in ${adminSubject.department?.name || adminSubject.department}. `;
      message += "Students must be assigned to the correct semester/year in the Student Management system.";
    } else {
      const filterType = targetSemesterId ? `semester ${adminSubject.semester}` : `year ${targetYear}`;
      message = `Found ${studentsWithName.length} students in ${filterType}`;
    }

    res.json({ 
      success: true, 
      data: studentsWithName,
      subject: {
        _id: adminSubject._id,
        name: adminSubject.name,
        department: adminSubject.department?.name || adminSubject.department,
        semester: adminSubject.semester || 'Not Specified',
        year: targetYear || 'Not Specified',
        section: 'All Sections'
      },
      totalStudents: studentsWithName.length,
      message: message
    });
  } catch (error) {
    console.error("[GetSubjectStudents] Error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      error: error.toString()
    });
  }
});

// GET /api/faculty/attendance/:subjectId?date=YYYY-MM-DD
router.get("/attendance/:subjectId", async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { date } = req.query;
    const query = { subject: subjectId };
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      query.date = d;
    }
    const records = await Attendance.find(query)
      .populate("student")
      .populate("faculty");
    res.json({ success: true, records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
