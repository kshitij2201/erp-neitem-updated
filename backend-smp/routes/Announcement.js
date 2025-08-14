import express from "express";
import Announcement from "../models/Announcement.js";
import Faculty from "../models/faculty.js";

const router = express.Router();

// Get all announcements visible to students
router.get("/", async (req, res) => {
  try {
    const announcements = await Announcement.find({
      visibleTo: "student",
      endDate: { $gte: new Date() },
    }).sort({ date: -1 });
    res.json(announcements);
  } catch (err) {
    console.error("Error fetching announcements:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get announcements for a specific dashboard
router.get("/:dashboard", async (req, res) => {
  try {
    const dashboard = req.params.dashboard;
    const { department } = req.query; // Get department from query params

    console.log(
      `Fetching announcements for dashboard: ${dashboard}, department: ${
        department || "none"
      }`
    );

    const validDashboards = [
      "student",
      "teaching_staff",
      "non_teaching_staff",
      "hod",
      "principal",
      "cc",
    ];
    if (!validDashboards.includes(dashboard)) {
      return res.status(400).json({ error: "Invalid dashboard" });
    }

    let query = {
      visibleTo: dashboard,
      endDate: { $gte: new Date() },
    };

    // Department filtering logic - only apply if department is provided
    if (
      department &&
      (dashboard === "teaching_staff" || dashboard === "non_teaching_staff")
    ) {
      // For teaching and non-teaching staff, show:
      // 1. Principal announcements (no department restriction)
      // 2. HOD announcements from their department only
      // 3. Old announcements without createdBy field (backward compatibility)
      query = {
        $and: [
          { visibleTo: dashboard },
          { endDate: { $gte: new Date() } },
          {
            $or: [
              { createdBy: "principal" }, // Principal announcements (visible to all)
              {
                $and: [{ createdBy: "hod" }, { department: department }],
              }, // HOD announcements from same department
              { createdBy: { $exists: false } }, // Backward compatibility for old announcements
            ],
          },
        ],
      };
    } else if (department && dashboard === "hod") {
      // HOD can see announcements created by HOD from their department + Principal announcements
      query = {
        $and: [
          { visibleTo: dashboard },
          { endDate: { $gte: new Date() } },
          {
            $or: [
              { createdBy: "principal" }, // Principal announcements
              {
                $and: [{ createdBy: "hod" }, { department: department }],
              }, // HOD announcements from same department
              { createdBy: { $exists: false } }, // Backward compatibility for old announcements
            ],
          },
        ],
      };
    }
    // For principal, student, and cc - no department filtering needed (existing behavior)
    // Also fallback for cases where no department is provided

    console.log("Query being used:", JSON.stringify(query, null, 2));
    const announcements = await Announcement.find(query).sort({ date: -1 });
    console.log(`Found ${announcements.length} announcements`);

    res.json(announcements);
  } catch (err) {
    console.error("Error fetching announcements:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Create a new announcement
router.post("/", async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ error: "Request body is missing" });
    }

    const {
      title,
      description,
      tag,
      endDate,
      visibleTo,
      createdBy,
      department,
    } = req.body;
    if (
      !title ||
      !description ||
      !tag ||
      !endDate ||
      !visibleTo ||
      !Array.isArray(visibleTo) ||
      !createdBy
    ) {
      return res.status(400).json({ error: "Missing or invalid fields" });
    }

    // For HOD announcements, department is required
    if (createdBy === "hod" && !department) {
      return res
        .status(400)
        .json({ error: "Department is required for HOD announcements" });
    }

    // Update visibleTo based on creator role
    let updatedVisibleTo;
    if (createdBy === "principal") {
      // Principal announcements can be visible to anyone they select + always include hod and principal
      updatedVisibleTo = [...new Set([...visibleTo, "hod", "principal"])];
    } else if (createdBy === "hod") {
      // HOD announcements are limited to department members only + include hod and principal for visibility
      updatedVisibleTo = [...new Set([...visibleTo, "hod", "principal"])];
    } else {
      // Other creators (fallback)
      updatedVisibleTo = [...new Set([...visibleTo, "hod", "principal"])];
    }

    const announcement = new Announcement({
      title,
      description,
      tag,
      endDate: new Date(endDate),
      visibleTo: updatedVisibleTo,
      department: createdBy === "hod" ? department : null, // Only store department for HOD announcements
      createdBy,
    });

    await announcement.save();
    res.status(201).json(announcement);
  } catch (err) {
    console.error("Error creating announcement:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
