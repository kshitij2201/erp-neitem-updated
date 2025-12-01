import express from "express";
import Subject from "../models/Subject.js";
import Department from "../models/Department.js";
import AdminSubject from "../models/AdminSubject.js";
import AcademicDepartment from "../models/AcademicDepartment.js";
import Semester from "../models/Semester.js";

const router = express.Router();

// GET all subjects
router.get("/", async (req, res) => {
  try {
    console.log("[SubjectsFetch] Starting subject fetch...");
    const subjects = await Subject.find().populate("department");
    console.log("[SubjectsFetch] Subjects retrieved:", subjects.length);

    // Validate populated data
    const validSubjects = subjects.filter((subject) => {
      if (!subject.department || !subject.name) {
        console.warn("[SubjectsFetch] Invalid subject:", {
          _id: subject._id,
          name: subject.name,
          department: subject.department,
        });
        return false;
      }
      return true;
    });

    if (validSubjects.length === 0) {
      console.log("[SubjectsFetch] No valid subjects found");
      return res.status(200).json({
        success: true,
        message: "No valid subjects found",
        data: [],
      });
    }

    res.status(200).json({
      success: true,
      message: "Subjects retrieved successfully",
      data: validSubjects,
    });
  } catch (error) {
    console.error("[SubjectsFetch] Error:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Error fetching subjects",
      error: error.message,
    });
  }
});

// GET subjects by department (query parameter version)
router.get("/by-department", async (req, res) => {
  try {
    const { department: departmentName } = req.query;

    if (!departmentName) {
      return res.status(400).json({
        success: false,
        message: "Department parameter is required",
      });
    }

    console.log(
      "[SubjectsByDepartment] Fetching subjects for department:",
      departmentName
    );

    // First try AdminSubject with AcademicDepartment
    const academicDepartment = await AcademicDepartment.findOne({
      name: { $regex: new RegExp(departmentName, "i") },
    });

    if (academicDepartment) {
      console.log(
        "[SubjectsByDepartment] Found academic department:",
        academicDepartment.name
      );

      // Find admin subjects for this department
      const adminSubjects = await AdminSubject.find({
        department: academicDepartment._id,
      }).populate("department");
      console.log(
        "[SubjectsByDepartment] Admin subjects found:",
        adminSubjects.length
      );

      console.log(
        "[SubjectsByDepartment] Admin subjects data:", adminSubjects
      );

      if (adminSubjects.length > 0) {
        const formattedSubjects = await Promise.all(adminSubjects.map(async (subject) => {
          // Find the semester this subject belongs to
          const semesterDoc = await Semester.findOne({ subjects: subject._id });
          const semester = semesterDoc ? semesterDoc.number : subject.semester || "N/A";
          return {
            _id: subject._id,
            name: subject.name,
            code: subject.code || subject.subjectCode || "",
            department: subject.department?.name || departmentName,
            semester: semester,
            type: "admin",
          };
        }));

        return res.status(200).json({
          success: true,
          message: "Admin subjects retrieved successfully",
          data: formattedSubjects,
          department: departmentName,
        });
      }
    }

    // Fallback to old Department/Subject logic
    const department = await Department.findOne({
      name: { $regex: new RegExp(departmentName, "i") },
    });

    if (!department) {
      console.log(
        "[SubjectsByDepartment] No department found:",
        departmentName
      );
      return res.status(200).json({
        success: true,
        message: "Department not found",
        data: [],
      });
    }

    // Find subjects for this department (populate semester for legacy subjects)
    const subjects = await Subject.find({
      department: department._id,
    }).populate("department").populate("semester");
    console.log(
      "[SubjectsByDepartment] Legacy subjects found:",
      subjects.length
    );

    const formattedSubjects = subjects.map((subject) => {
      // Enhanced semester detection
      let semester = subject.semester?.number || subject.year;
      
      if (!semester || semester === "N/A") {
        const name = subject.name?.toLowerCase() || "";
        
        // First year subjects (Semester 1 & 2)
        if (name.includes("mathematics – i") || name.includes("applied physics") || 
            name.includes("engineering graphics") || name.includes("c-programming") ||
            name.includes("basics of mechanical") || name.includes("communication skill")) {
          semester = name.includes("lab") || name.includes("(p)") ? 1 : 1;
        }
        else if (name.includes("mathematics – ii") || name.includes("applied chemistry") ||
                 name.includes("engineering mechanics") || name.includes("workshop practices")) {
          semester = 2;
        }
        // Second year subjects (Semester 3 & 4)  
        else if (name.includes("fluid mechanics") || name.includes("kinematics") ||
                 name.includes("manufacturing") || name.includes("thermodynamics")) {
          semester = 3;
        }
        else if (name.includes("heat transfer") || name.includes("machine drawing") ||
                 name.includes("minor-i")) {
          semester = 4;
        }
        // Third year subjects (Semester 5 & 6)
        else if (name.includes("design of machine") || name.includes("energy conversion i") ||
                 name.includes("automation") || name.includes("minor-ii")) {
          semester = 5;
        }
        else if (name.includes("dynamics of machines") || name.includes("energy conversion -ii") ||
                 name.includes("mechanical measurment")) {
          semester = 6;
        }
        // Fourth year subjects (Semester 7 & 8)
        else if (name.includes("elective") && (name.includes("iii") || name.includes("- iii") ||
                 name.includes("computer aided") || name.includes("advancements in automobile"))) {
          semester = 7;
        }
        else if (name.includes("project") || name.includes("elective") && 
                 (name.includes("iv") || name.includes("v") || name.includes("vi"))) {
          semester = 8;
        }
        // Professional skills
        else if (name.includes("professional skill lab i")) {
          semester = 1;
        }
        else if (name.includes("professional skill lab iv")) {
          semester = 4;
        }
        // Mobile computing, Internet of Things
        else if (name.includes("mobile computing")) {
          semester = 5;
        }
        else if (name.includes("internet of things")) {
          semester = 2;
        }
        else {
          semester = "N/A";
        }
      }
      
      return {
        _id: subject._id,
        name: subject.name,
        code: subject.subjectCode,
        department: subject.department?.name || departmentName,
        semester: semester,
        totalLectures: subject.totalLectures,
        type: "legacy",
      };
    });

    res.status(200).json({
      success: true,
      message: "Subjects retrieved successfully",
      data: formattedSubjects,
      department: departmentName,
    });
  } catch (error) {
    console.error("[SubjectsByDepartment] Error:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Error fetching subjects by department",
      error: error.message,
    });
  }
});

// GET subjects by department (URL parameter version)
router.get("/department/:departmentName", async (req, res) => {
  try {
    const { departmentName } = req.params;
    console.log(
      "[SubjectsByDepartment] Fetching subjects for department:",
      departmentName
    );

    // First try AdminSubject with AcademicDepartment
    const academicDepartment = await AcademicDepartment.findOne({
      name: { $regex: new RegExp(departmentName, "i") },
    });

    if (academicDepartment) {
      console.log(
        "[SubjectsByDepartment] Found academic department:",
        academicDepartment.name
      );

      // Find admin subjects for this department
      const adminSubjects = await AdminSubject.find({
        department: academicDepartment._id,
      }).populate("department");
      console.log(
        "[SubjectsByDepartment] Admin subjects found:",
        adminSubjects.length
      );

      if (adminSubjects.length > 0) {
        const formattedSubjects = await Promise.all(adminSubjects.map(async (subject) => {
          // Find the semester this subject belongs to
          const semesterDoc = await Semester.findOne({ subjects: subject._id });
          const semester = semesterDoc ? semesterDoc.number : subject.semester || "N/A";
          return {
            _id: subject._id,
            name: subject.name,
            code: subject.code || subject.subjectCode || "",
            department: subject.department?.name || departmentName,
            semester: semester,
            type: "admin",
          };
        }));

        return res.status(200).json({
          success: true,
          message: "Admin subjects retrieved successfully",
          data: formattedSubjects,
          department: departmentName,
        });
      }
    }

    // Fallback to old Department/Subject logic
    const department = await Department.findOne({
      name: { $regex: new RegExp(departmentName, "i") },
    });

    if (!department) {
      console.log(
        "[SubjectsByDepartment] No department found:",
        departmentName
      );
      return res.status(200).json({
        success: true,
        message: "Department not found",
        data: [],
      });
    }

    // Find subjects for this department (populate semester for legacy subjects)
    const subjects = await Subject.find({
      department: department._id,
    }).populate("department").populate("semester");
    console.log(
      "[SubjectsByDepartment] Legacy subjects found:",
      subjects.length
    );

    const formattedSubjects = subjects.map((subject) => {
      // Enhanced semester detection
      let semester = subject.semester?.number || subject.year;
      
      if (!semester || semester === "N/A") {
        const name = subject.name?.toLowerCase() || "";
        
        // First year subjects (Semester 1 & 2)
        if (name.includes("mathematics – i") || name.includes("applied physics") || 
            name.includes("engineering graphics") || name.includes("c-programming") ||
            name.includes("basics of mechanical") || name.includes("communication skill")) {
          semester = name.includes("lab") || name.includes("(p)") ? 1 : 1;
        }
        else if (name.includes("mathematics – ii") || name.includes("applied chemistry") ||
                 name.includes("engineering mechanics") || name.includes("workshop practices")) {
          semester = 2;
        }
        // Second year subjects (Semester 3 & 4)  
        else if (name.includes("fluid mechanics") || name.includes("kinematics") ||
                 name.includes("manufacturing") || name.includes("thermodynamics")) {
          semester = 3;
        }
        else if (name.includes("heat transfer") || name.includes("machine drawing") ||
                 name.includes("minor-i")) {
          semester = 4;
        }
        // Third year subjects (Semester 5 & 6)
        else if (name.includes("design of machine") || name.includes("energy conversion i") ||
                 name.includes("automation") || name.includes("minor-ii")) {
          semester = 5;
        }
        else if (name.includes("dynamics of machines") || name.includes("energy conversion -ii") ||
                 name.includes("mechanical measurment")) {
          semester = 6;
        }
        // Fourth year subjects (Semester 7 & 8)
        else if (name.includes("elective") && (name.includes("iii") || name.includes("- iii") ||
                 name.includes("computer aided") || name.includes("advancements in automobile"))) {
          semester = 7;
        }
        else if (name.includes("project") || name.includes("elective") && 
                 (name.includes("iv") || name.includes("v") || name.includes("vi"))) {
          semester = 8;
        }
        // Professional skills
        else if (name.includes("professional skill lab i")) {
          semester = 1;
        }
        else if (name.includes("professional skill lab iv")) {
          semester = 4;
        }
        // Mobile computing, Internet of Things
        else if (name.includes("mobile computing")) {
          semester = 5;
        }
        else if (name.includes("internet of things")) {
          semester = 2;
        }
        else {
          semester = "N/A";
        }
      }
      
      return {
        _id: subject._id,
        name: subject.name,
        code: subject.subjectCode,
        department: subject.department?.name || departmentName,
        semester: semester,
        totalLectures: subject.totalLectures,
        type: "legacy",
      };
    });

    res.status(200).json({
      success: true,
      message: "Subjects retrieved successfully",
      data: formattedSubjects,
      department: departmentName,
    });
  } catch (error) {
    console.error("[SubjectsByDepartment] Error:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Error fetching subjects by department",
      error: error.message,
    });
  }
});

export default router;
