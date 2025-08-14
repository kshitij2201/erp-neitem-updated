import express from "express";
import mongoose from "mongoose";
import Leave from "../models/Leave.js";
import ODLeave from "../models/ODLeave.js";
import Principal from "../models/PrincipalHistory.js";
import LeaveSummary from "../models/LeaveSummary.js";
import Faculty from "../models/faculty.js";
import multer from "multer";
import path from "path";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Sanitize department name
const sanitizeCollectionName = (department) => {
  return department
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toLowerCase();
};

// Calculate leave days
const calculateLeaveDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

// Apply for regular leave
router.post("/apply", upload.single("attachment"), async (req, res) => {
  try {
    const {
      employeeId,
      firstName,
      leaveType,
      type = "Faculty",
      startDate,
      endDate,
      leaveDuration = "Full Day",
      reason,
      contact,
    } = req.body;

    if (
      !employeeId ||
      !firstName ||
      !leaveType ||
      !startDate ||
      !endDate ||
      !leaveDuration ||
      !reason
    ) {
      return res
        .status(400)
        .json({ message: "All required fields must be provided" });
    }

    const faculty = await Faculty.findOne({ employeeId });
    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    const validLeaveTypes = [
      "Sick Leave",
      "Casual Leave",
      "Earned Leave",
      "Sabbatical",
      "CompOff Leave",
    ];
    const validTypes = ["Faculty", "HOD", "Principal", "Staff"];
    if (!validLeaveTypes.includes(leaveType)) {
      return res.status(400).json({ message: "Invalid leave type" });
    }
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: "Invalid employee type" });
    }

    const leaveDays = calculateLeaveDays(startDate, endDate);

    // Only "teaching" or "cc" goes to HOD, others go directly to principal
    let initialStatus = "Pending";
    if (faculty.type !== "teaching" && faculty.type !== "cc") {
      initialStatus = "HOD Approved"; // Skip HOD approval for non-teaching, HOD, Principal, Staff
    }

    const leave = new Leave({
      employeeId,
      firstName,
      department: faculty.department,
      leaveCategory: "Regular",
      leaveType,
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      leaveDuration,
      reason,
      contact,
      attachment: req.file ? req.file.path : undefined,
      leaveDays,
      status: initialStatus,
      hodDecision:
        faculty.type !== "teaching" && faculty.type !== "cc" ? null : undefined,
      principalDecision: null,
    });
    await leave.save();

    res
      .status(201)
      .json({ message: "Leave request submitted", leaveId: leave._id });
  } catch (error) {
    console.error("Apply leave error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Apply for OD leave
router.post(
  "/odleave/apply",
  upload.fields([{ name: "attachment" }, { name: "approvalLetter" }]),
  async (req, res) => {
    try {
      const {
        employeeId,
        firstName,
        leaveType,
        type = "Faculty",
        startDate,
        endDate,
        leaveDuration = "Full Day",
        reason,
        contact,
        eventName,
        location,
      } = req.body;

      if (
        !employeeId ||
        !firstName ||
        !leaveType ||
        !startDate ||
        !endDate ||
        !leaveDuration ||
        !reason ||
        !eventName ||
        !location
      ) {
        return res
          .status(400)
          .json({ message: "All required fields must be provided" });
      }

      const faculty = await Faculty.findOne({ employeeId });
      if (!faculty) {
        return res.status(404).json({ message: "Faculty not found" });
      }

      const validLeaveTypes = ["Conference", "Workshop", "Official Duty"];
      const validTypes = ["Faculty", "HOD", "Principal", "Staff"];
      if (!validLeaveTypes.includes(leaveType)) {
        return res.status(400).json({ message: "Invalid OD leave type" });
      }
      if (!validTypes.includes(type)) {
        return res.status(400).json({ message: "Invalid employee type" });
      }

      const leaveDays = calculateLeaveDays(startDate, endDate);

      // Determine initial status based on employee type
      let initialStatus = "Pending";
      if (type === "HOD" || type === "Staff") {
        initialStatus = "HOD Approved"; // Skip HOD approval for HODs and Staff
      }

      const odLeave = new ODLeave({
        employeeId,
        firstName,
        department: faculty.department,
        leaveType,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        leaveDuration,
        reason,
        contact,
        eventName,
        location,
        attachment: req.files?.attachment
          ? req.files.attachment[0].path
          : undefined,
        approvalLetter: req.files?.approvalLetter
          ? req.files.approvalLetter[0].path
          : undefined,
        leaveDays,
        status: initialStatus,
        hodDecision: type === "HOD" || type === "Staff" ? null : undefined,
        principalDecision: null,
      });
      await odLeave.save();

      res
        .status(201)
        .json({ message: "OD leave request submitted", leaveId: odLeave._id });
    } catch (error) {
      console.error("Apply OD leave error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Fetch all regular leaves
router.get("/all", async (req, res) => {
  try {
    const leaves = await Leave.find({}).select(
      "employeeId firstName department leaveType type startDate endDate reason contact attachment leaveDays status hodDecision principalDecision createdAt"
    );
    res.status(200).json(leaves);
  } catch (error) {
    console.error("Fetch all leaves error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Fetch all OD leaves
router.get("/odleave/all", async (req, res) => {
  try {
    const odLeaves = await ODLeave.find({}).select(
      "employeeId firstName department leaveType type startDate endDate reason contact attachment eventName location approvalLetter leaveDays status hodDecision principalDecision createdAt"
    );
    res.status(200).json(odLeaves);
  } catch (error) {
    console.error("Fetch all OD leaves error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Fetch leaves for HOD
router.get("/hod/:department", async (req, res) => {
  try {
    const { department } = req.params;
    const departmentRegex = new RegExp(`^${department}$`, "i");

    const [regularLeaves, odLeaves] = await Promise.all([
      Leave.find({
        department: departmentRegex,
        // HOD should see ALL leaves from their department (all statuses)
        type: { $nin: ["HOD", "Staff"] }, // Exclude HOD and Staff requests
      }).select(
        "employeeId firstName department leaveType type startDate endDate reason leaveDays status"
      ),
      ODLeave.find({
        department: departmentRegex,
        // HOD should see ALL OD leaves from their department (all statuses)
        type: { $nin: ["HOD", "Staff"] }, // Exclude HOD and Staff requests
      }).select(
        "employeeId firstName department leaveType type startDate endDate reason eventName location leaveDays status"
      ),
    ]);

    const combinedLeaves = [
      ...regularLeaves.map((leave) => ({
        ...leave._doc,
        leaveCategory: "Regular",
      })),
      ...odLeaves.map((leave) => ({ ...leave._doc, leaveCategory: "OD" })),
    ];

    console.log(
      `HOD ${department} fetched ${combinedLeaves.length} leaves (all statuses)`
    );
    res.status(200).json(combinedLeaves);
  } catch (error) {
    console.error("HOD fetch error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// HOD decision
router.put("/hod/:leaveId", async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { decision, comment, hodEmployeeId } = req.body;

    if (!decision || !hodEmployeeId) {
      return res
        .status(400)
        .json({ message: "Decision and hodEmployeeId are required" });
    }

    // First, verify the HOD's department
    const hodFaculty = await Faculty.findOne({
      employeeId: hodEmployeeId,
      role: "hod",
    });
    if (!hodFaculty) {
      return res
        .status(403)
        .json({ message: "HOD not found or not authorized" });
    }

    let leave = await Leave.findById(leaveId);
    let isODLeave = false;

    if (!leave) {
      leave = await ODLeave.findById(leaveId);
      isODLeave = true;
      if (!leave) {
        return res.status(404).json({ message: "Leave request not found" });
      }
    }

    // Ensure leave belongs to HOD's department
    if (leave.department !== hodFaculty.department) {
      return res.status(403).json({
        message: "You can only approve leaves from your own department",
      });
    }

    // Ensure leave is pending HOD approval
    if (leave.status !== "Pending") {
      return res
        .status(400)
        .json({ message: "Leave is not pending HOD approval" });
    }

    // Ensure requester is not HOD or Staff (they skip HOD approval)
    if (leave.type === "HOD" || leave.type === "Staff") {
      return res
        .status(400)
        .json({ message: "This leave does not require HOD approval" });
    }

    const hod = await Faculty.findOne({
      employeeId: hodEmployeeId,
      department: leave.department,
      role: "hod",
    });
    if (!hod) {
      return res.status(403).json({ message: "Not authorized as HOD" });
    }

    leave.hodDecision = {
      employeeId: hodEmployeeId,
      decision,
      comment,
      decidedAt: new Date(),
    };
    leave.status = decision === "Approved" ? "HOD Approved" : "HOD Rejected";
    await leave.save();

    res
      .status(200)
      .json({ message: `Leave request ${decision.toLowerCase()} by HOD` });
  } catch (error) {
    console.error("HOD decision error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Fetch leaves for Principal
router.get("/principal", async (req, res) => {
  try {
    const [regularLeaves, odLeaves] = await Promise.all([
      Leave.find({
        status: { $in: ["HOD Approved", "Pending"] }, // Include HOD-approved and direct Principal requests
        $or: [
          { type: { $in: ["HOD", "Staff"] } }, // Direct requests from HOD/Staff
          { status: "HOD Approved" }, // HOD-approved requests
        ],
      }).select(
        "employeeId firstName department leaveType type startDate endDate reason leaveDays hodDecision status"
      ),
      ODLeave.find({
        status: { $in: ["HOD Approved", "Pending"] }, // Include HOD-approved and direct Principal requests
        $or: [
          { type: { $in: ["HOD", "Staff"] } }, // Direct requests from HOD/Staff
          { status: "HOD Approved" }, // HOD-approved requests
        ],
      }).select(
        "employeeId firstName department leaveType type startDate endDate reason eventName location leaveDays hodDecision status"
      ),
    ]);

    const combinedLeaves = [
      ...regularLeaves.map((leave) => ({
        ...leave._doc,
        leaveCategory: "Regular",
        hodStatus: leave.hodDecision?.decision || "N/A",
      })),
      ...odLeaves.map((leave) => ({
        ...leave._doc,
        leaveCategory: "OD",
        hodStatus: leave.hodDecision?.decision || "N/A",
      })),
    ];

    res.status(200).json(combinedLeaves);
  } catch (error) {
    console.error("Principal fetch error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Fetch all leaves for Principal (all departments that require principal approval)
router.get("/principal/all", async (req, res) => {
  try {
    const [regularLeaves, odLeaves] = await Promise.all([
      Leave.find({
        $or: [
          { status: "HOD Approved" }, // Teaching staff approved by HOD, pending principal
          { status: "Principal Approved" }, // Already approved by principal
          { status: "Principal Rejected" }, // Already rejected by principal
          {
            status: "Pending",
            type: { $in: ["HOD", "Staff", "Principal"] }, // Non-teaching staff direct to principal
          },
        ],
      }).select(
        "employeeId firstName department leaveType type startDate endDate reason leaveDays status hodDecision principalDecision createdAt"
      ),
      ODLeave.find({
        $or: [
          { status: "HOD Approved" }, // Teaching staff approved by HOD, pending principal
          { status: "Principal Approved" }, // Already approved by principal
          { status: "Principal Rejected" }, // Already rejected by principal
          {
            status: "Pending",
            type: { $in: ["HOD", "Staff", "Principal"] }, // Non-teaching staff direct to principal
          },
        ],
      }).select(
        "employeeId firstName department leaveType type startDate endDate reason eventName location leaveDays status hodDecision principalDecision createdAt"
      ),
    ]);

    const combinedLeaves = [
      ...regularLeaves.map((leave) => ({
        ...leave._doc,
        leaveCategory: "Regular",
      })),
      ...odLeaves.map((leave) => ({
        ...leave._doc,
        leaveCategory: "OD",
      })),
    ];

    console.log(
      `Principal fetched ${combinedLeaves.length} leaves (all that require principal approval)`
    );
    res.status(200).json(combinedLeaves);
  } catch (error) {
    console.error("Principal all leaves fetch error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Principal decision
router.put("/principal/:leaveId", async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { decision, comment, principalEmployeeId } = req.body;

    if (!decision || !principalEmployeeId) {
      return res
        .status(400)
        .json({ message: "Decision and principalEmployeeId are required" });
    }

    let leave = await Leave.findById(leaveId);
    let isODLeave = false;

    if (!leave) {
      leave = await ODLeave.findById(leaveId);
      isODLeave = true;
      if (!leave) {
        return res.status(404).json({ message: "Leave request not found" });
      }
    }

    // Ensure leave is pending Principal approval
    if (leave.status !== "HOD Approved" && leave.status !== "Pending") {
      return res
        .status(400)
        .json({ message: "Leave is not pending Principal approval" });
    }

    // For Pending leaves, ensure they are from HOD or Staff
    if (
      leave.status === "Pending" &&
      leave.type !== "HOD" &&
      leave.type !== "Staff"
    ) {
      return res.status(400).json({
        message:
          "This leave requires HOD approval before Principal can review it",
      });
    }

    const principal = await Faculty.findOne({
      employeeId: principalEmployeeId,
      $or: [{ type: "Principal" }, { role: "principal" }],
    });
    if (!principal) {
      return res.status(403).json({
        message: "Not authorized as Principal",
        details: `No Faculty record found for employeeId ${principalEmployeeId} with type 'Principal' or role 'principal'`,
      });
    }

    leave.principalDecision = {
      employeeId: principalEmployeeId,
      decision,
      comment,
      decidedAt: new Date(),
    };
    leave.status =
      decision === "Approved" ? "Principal Approved" : "Principal Rejected";
    await leave.save();

    if (decision === "Approved" && !isODLeave) {
      const year = new Date(leave.startDate).getFullYear();
      const month = new Date(leave.startDate).getMonth() + 1;

      let summary = await LeaveSummary.findOne({
        employeeId: leave.employeeId,
      });
      if (!summary) {
        summary = new LeaveSummary({
          employeeId: leave.employeeId,
          monthlyLeaves: [],
          yearlyLeaves: [],
        });
      }

      let monthly = summary.monthlyLeaves.find(
        (m) => m.year === year && m.month === month
      );
      if (!monthly) {
        summary.monthlyLeaves.push({ year, month, days: leave.leaveDays });
      } else {
        monthly.days += leave.leaveDays;
      }

      let yearly = summary.yearlyLeaves.find((y) => y.year === year);
      if (!yearly) {
        summary.yearlyLeaves.push({ year, days: leave.leaveDays });
      } else {
        yearly.days += leave.leaveDays;
      }

      await summary.save();
    }

    res.status(200).json({
      message: `Leave request ${decision.toLowerCase()} by Principal`,
    });
  } catch (error) {
    console.error("Principal decision error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Fetch leave summary
router.get("/summary/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const summary = await LeaveSummary.findOne({ employeeId });
    if (!summary) {
      return res.status(404).json({ message: "No leave summary found" });
    }
    res.status(200).json(summary);
  } catch (error) {
    console.error("Summary fetch error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create Principal
router.post("/principal/create", async (req, res) => {
  try {
    const { employeeId, name } = req.body;

    if (!employeeId || !name) {
      return res.status(400).json({ message: "employeeId and name required" });
    }

    let principal = await Principal.findOne({ employeeId });
    if (principal) {
      principal.name = name;
      await principal.save();
    } else {
      principal = new Principal({ employeeId, name });
      await principal.save();
    }

    await Faculty.findOneAndUpdate(
      { employeeId },
      {
        employeeId,
        firstName: name,
        type: "Principal",
        role: "principal",
        department: "Administration",
      },
      { upsert: true }
    );

    res
      .status(201)
      .json({ message: "Principal created successfully", principal });
  } catch (error) {
    console.error("Principal create error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Fetch all leaves for a specific employee (sender)
router.get("/my-leaves/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const leaves = await Leave.find({ employeeId })
      .select(
        "employeeId firstName department leaveType type startDate endDate reason contact attachment leaveDays status hodDecision principalDecision createdAt"
      )
      .lean();
    // Ensure principalDecision and hodDecision are always objects or null
    const formatted = leaves.map((l) => ({
      ...l,
      hodDecision: l.hodDecision || null,
      principalDecision: l.principalDecision || null,
      status: l.status || "Pending",
    }));
    res.status(200).json({ leaves: formatted });
  } catch (error) {
    console.error("Fetch my leaves error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Leave Management Dashboard APIs

// Get all leaves for management dashboard
router.get("/management/all-leaves", async (req, res) => {
  try {
    const leaves = await Leave.find({}).sort({ createdAt: -1 }).lean();

    // Get all unique employee IDs
    const employeeIds = [...new Set(leaves.map((leave) => leave.employeeId))];

    // Fetch employee details from faculty collection
    const employees = await Faculty.find({
      employeeId: { $in: employeeIds },
    }).lean();
    const employeeMap = employees.reduce((map, emp) => {
      map[emp.employeeId] = emp;
      return map;
    }, {});

    const formattedLeaves = leaves.map((leave) => {
      const approvalInfo = getApprovalInfo(leave);
      const employee = employeeMap[leave.employeeId];

      return {
        id: leave._id,
        employeeId: leave.employeeId,
        employeeName: employee
          ? `${employee.firstName} ${employee.lastName}`
          : `${leave.firstName || "Unknown"} ${leave.lastName || ""}`.trim(),
        department: employee?.department || leave.department,
        designation: employee?.designation || "Faculty",
        leaveType: leave.leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate,
        days: leave.leaveDays,
        status: leave.status?.toLowerCase() || "pending",
        reason: leave.reason,
        appliedDate: leave.createdAt,
        approvedBy: approvalInfo.approvedBy,
        approvedByRole: approvalInfo.approvedByRole,
        approvedDate: approvalInfo.approvedDate,
        comments: approvalInfo.comments,
      };
    });

    res.status(200).json({
      success: true,
      leaves: formattedLeaves,
      total: formattedLeaves.length,
    });
  } catch (error) {
    console.error("Error fetching all leaves for management:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching leaves",
      error: error.message,
    });
  }
});

// Get all OD leaves for management dashboard
router.get("/management/all-od-leaves", async (req, res) => {
  try {
    const odLeaves = await ODLeave.find({}).sort({ createdAt: -1 }).lean();

    // Get all unique employee IDs
    const employeeIds = [...new Set(odLeaves.map((leave) => leave.employeeId))];

    // Fetch employee details from faculty collection
    const employees = await Faculty.find({
      employeeId: { $in: employeeIds },
    }).lean();
    const employeeMap = employees.reduce((map, emp) => {
      map[emp.employeeId] = emp;
      return map;
    }, {});

    const formattedODLeaves = odLeaves.map((leave) => {
      const approvalInfo = getODLeaveApprovalInfo(leave);
      const employee = employeeMap[leave.employeeId];

      return {
        id: leave._id,
        employeeId: leave.employeeId,
        employeeName: employee
          ? `${employee.firstName} ${employee.lastName}`
          : `${leave.firstName || "Unknown"} ${leave.lastName || ""}`.trim(),
        department: employee?.department || leave.department,
        designation: employee?.designation || "Faculty",
        date: leave.date,
        purpose: leave.purpose,
        location: leave.place,
        status: leave.status?.toLowerCase() || "pending",
        appliedDate: leave.createdAt,
        approvedBy: approvalInfo.approvedBy,
        approvedByRole: approvalInfo.approvedByRole,
        approvedDate: approvalInfo.approvedDate,
        comments: approvalInfo.comments,
      };
    });

    res.status(200).json({
      success: true,
      odLeaves: formattedODLeaves,
      total: formattedODLeaves.length,
    });
  } catch (error) {
    console.error("Error fetching all OD leaves for management:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching OD leaves",
      error: error.message,
    });
  }
});

// Get leave statistics for management dashboard
router.get("/management/statistics", async (req, res) => {
  try {
    // Get regular leave statistics
    const totalLeaves = await Leave.countDocuments({});
    const pendingLeaves = await Leave.countDocuments({ status: "Pending" });
    const approvedLeaves = await Leave.countDocuments({ status: "Approved" });
    const rejectedLeaves = await Leave.countDocuments({ status: "Rejected" });

    // Get OD leave statistics
    const totalODLeaves = await ODLeave.countDocuments({});
    const pendingODLeaves = await ODLeave.countDocuments({ status: "Pending" });
    const approvedODLeaves = await ODLeave.countDocuments({
      status: "Approved",
    });
    const rejectedODLeaves = await ODLeave.countDocuments({
      status: "Rejected",
    });

    // Get employee-wise statistics
    const employeeStats = await getEmployeeLeaveStats();

    const statistics = {
      summary: {
        totalLeaves,
        pendingLeaves,
        approvedLeaves,
        rejectedLeaves,
        totalODLeaves,
        pendingODLeaves,
        approvedODLeaves,
        rejectedODLeaves,
      },
      employeeStats,
    };

    res.status(200).json({
      success: true,
      ...statistics,
    });
  } catch (error) {
    console.error("Error fetching leave statistics:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
      error: error.message,
    });
  }
});

// Helper function to get approval information from leave
const getApprovalInfo = (leave) => {
  const approvalInfo = {
    approvedBy: null,
    approvedByRole: null,
    approvedDate: null,
    comments: null,
  };

  if (leave.status === "Approved") {
    if (
      leave.principalDecision &&
      leave.principalDecision.status === "Approved"
    ) {
      approvalInfo.approvedBy =
        leave.principalDecision.approvedBy || "Principal";
      approvalInfo.approvedByRole = "Principal";
      approvalInfo.approvedDate = leave.principalDecision.date;
      approvalInfo.comments = leave.principalDecision.comments;
    } else if (leave.hodDecision && leave.hodDecision.status === "Approved") {
      approvalInfo.approvedBy = leave.hodDecision.approvedBy || "HOD";
      approvalInfo.approvedByRole = "HOD";
      approvalInfo.approvedDate = leave.hodDecision.date;
      approvalInfo.comments = leave.hodDecision.comments;
    }
  } else if (leave.status === "Rejected") {
    if (
      leave.principalDecision &&
      leave.principalDecision.status === "Rejected"
    ) {
      approvalInfo.approvedBy =
        leave.principalDecision.approvedBy || "Principal";
      approvalInfo.approvedByRole = "Principal";
      approvalInfo.approvedDate = leave.principalDecision.date;
      approvalInfo.comments = leave.principalDecision.comments;
    } else if (leave.hodDecision && leave.hodDecision.status === "Rejected") {
      approvalInfo.approvedBy = leave.hodDecision.approvedBy || "HOD";
      approvalInfo.approvedByRole = "HOD";
      approvalInfo.approvedDate = leave.hodDecision.date;
      approvalInfo.comments = leave.hodDecision.comments;
    }
  }

  return approvalInfo;
};

// Helper function to get approval information from OD leave
const getODLeaveApprovalInfo = (leave) => {
  const approvalInfo = {
    approvedBy: null,
    approvedByRole: null,
    approvedDate: null,
    comments: null,
  };

  if (leave.status === "Approved" || leave.status === "Rejected") {
    if (leave.principalDecision) {
      approvalInfo.approvedBy =
        leave.principalDecision.approvedBy || "Principal";
      approvalInfo.approvedByRole = "Principal";
      approvalInfo.approvedDate = leave.principalDecision.date;
      approvalInfo.comments = leave.principalDecision.comments;
    } else if (leave.hodDecision) {
      approvalInfo.approvedBy = leave.hodDecision.approvedBy || "HOD";
      approvalInfo.approvedByRole = "HOD";
      approvalInfo.approvedDate = leave.hodDecision.date;
      approvalInfo.comments = leave.hodDecision.comments;
    }
  }

  return approvalInfo;
};

// Helper function to get employee-wise leave statistics
const getEmployeeLeaveStats = async () => {
  try {
    const employeeStats = await Leave.aggregate([
      {
        $lookup: {
          from: "faculties",
          localField: "employeeId",
          foreignField: "employeeId",
          as: "employee",
        },
      },
      {
        $unwind: {
          path: "$employee",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$employeeId",
          employeeName: {
            $first: {
              $concat: ["$employee.firstName", " ", "$employee.lastName"],
            },
          },
          department: { $first: "$employee.department" },
          totalLeaves: { $sum: 1 },
          approvedLeaves: {
            $sum: { $cond: [{ $eq: ["$status", "Approved"] }, 1, 0] },
          },
          pendingLeaves: {
            $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] },
          },
          rejectedLeaves: {
            $sum: { $cond: [{ $eq: ["$status", "Rejected"] }, 1, 0] },
          },
          lastLeaveDate: { $max: "$endDate" },
        },
      },
      {
        $sort: { totalLeaves: -1 },
      },
    ]);

    // Add OD leave count for each employee
    const odLeaveStats = await ODLeave.aggregate([
      {
        $group: {
          _id: "$employeeId",
          odLeaves: { $sum: 1 },
        },
      },
    ]);

    // Merge OD leave stats with regular leave stats
    const odLeaveMap = odLeaveStats.reduce((acc, item) => {
      acc[item._id] = item.odLeaves;
      return acc;
    }, {});

    return employeeStats.map((stat) => ({
      employeeId: stat._id,
      employeeName: stat.employeeName || "Unknown",
      department: stat.department || "Unknown",
      totalLeaves: stat.totalLeaves,
      approvedLeaves: stat.approvedLeaves,
      pendingLeaves: stat.pendingLeaves,
      rejectedLeaves: stat.rejectedLeaves,
      odLeaves: odLeaveMap[stat._id] || 0,
      lastLeaveDate: stat.lastLeaveDate,
    }));
  } catch (error) {
    console.error("Error getting employee leave stats:", error);
    return [];
  }
};

export default router;
