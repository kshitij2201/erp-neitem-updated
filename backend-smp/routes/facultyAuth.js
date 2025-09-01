import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Faculty from "../models/faculty.js";
import HODHistory from "../models/HODHistory.js";
import PrincipalHistory from "../models/PrincipalHistory.js";

const router = express.Router(); // ✅ valid

router.post("/", async (req, res) => {
  try {
    const { firstname, type, employmentStatus, employeeId, password } =
      req.body;

    // Hash the password using bcrypt before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    const faculty = new Faculty({
      firstname,
      type,
      employmentStatus,
      employeeId,
      password: hashedPassword,
    });

    await faculty.save();
    res.status(201).json(faculty);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all faculty
router.get("/", async (req, res) => {
  try {
    const faculties = await Faculty.find(); // Fetch all faculties

    if (faculties.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No faculty records found",
      });
    }

    res.status(200).json({
      success: true,
      data: faculties,
    });
  } catch (error) {
    console.error("Get Faculties Error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while retrieving faculty data",
      error: error.message,
    });
  }
});

// Get all faculty (alternative endpoint for frontend compatibility)
router.get("/faculties", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 1000; // Default limit
    const faculties = await Faculty.find().limit(limit); // Fetch faculties with limit

    if (faculties.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No faculty records found",
      });
    }

    res.status(200).json({
      success: true,
      data: faculties,
      count: faculties.length,
    });
  } catch (error) {
    console.error("Get Faculties Error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while retrieving faculty data",
      error: error.message,
    });
  }
});

// Update employment status
router.put("/:id/status", async (req, res) => {
  try {
    const { employmentStatus } = req.body;
    const faculty = await Faculty.findByIdAndUpdate(
      req.params.id,
      { employmentStatus },
      { new: true }
    );
    res.json(faculty);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete faculty
router.delete("/:id", async (req, res) => {
  try {
    const faculty = await Faculty.findByIdAndDelete(req.params.id);
    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }
    res.json({ message: "Faculty deleted successfully." });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Faculty Login (type-based, only Permanent Employee allowed)
router.post("/rolelogin", async (req, res) => {
  try {
    const { employeeId, password } = req.body;

    // Find faculty by employeeId
    const faculty = await Faculty.findOne({ employeeId });

    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    // Check if employment status is 'Permanent Employee'
    if (faculty.employmentStatus !== "Permanent Employee") {
      return res
        .status(403)
        .json({ error: "Only Permanent Employees can log in" });
    }

    // Check if the password matches
    const isMatch = await bcrypt.compare(password, faculty.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Check if faculty has valid dashboard access
    const validDashboardRoles = [
      "principal",
      "HOD",
      "hod",
      "cc",
      "facultymanagement",
      "teaching",
      "non-teaching"
    ];
    const facultyRole = faculty.role || faculty.type;

    if (!validDashboardRoles.includes(facultyRole)) {
      return res.status(403).json({
        error:
          "Access denied: You don't have permission to access any dashboard. Please contact administrator.",
        code: "NO_DASHBOARD_ACCESS",
      });
    }

    // Create a JWT token
    const token = jwt.sign(
      { id: faculty._id, type: faculty.type },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Respond with the token
    res.json({ token, faculty });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get HOD history
router.get("/hod-history", async (req, res) => {
  try {
    console.log("Fetching HOD history...");
    const hodHistory = await HODHistory.find()
      .populate("facultyId", "firstName lastName employeeId")
      .sort({ startDate: -1 });

    console.log(`Found ${hodHistory.length} HOD history records`);
    res.json(hodHistory);
  } catch (err) {
    console.error("Error fetching HOD history:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get Principal history
router.get("/principal-history", async (req, res) => {
  try {
    console.log("Fetching Principal history...");
    const principalHistory = await PrincipalHistory.find()
      .populate("facultyId", "firstName lastName employeeId")
      .sort({ startDate: -1 });

    console.log(`Found ${principalHistory.length} Principal history records`);
    res.json(principalHistory);
  } catch (err) {
    console.error("Error fetching Principal history:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
