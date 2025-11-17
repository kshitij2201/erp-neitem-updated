import express from "express";
import Announcement from "../models/Announcement.js";
import Faculty from "../models/faculty.js";

const router = express.Router();

// Get all announcements visible to students
router.get("/", async (req, res) => {
  try {
    const { department, semester } = req.query; // Get student's department and semester
    
    console.log(`Fetching student announcements for department: ${department || 'none'}, semester: ${semester || 'none'}`);
    
    let query = {
      visibleTo: { $in: ["student"] }, // Check if "student" is in the visibleTo array
      endDate: { $gte: new Date() },
    };
    
    // If department and semester are provided, include targeted announcements
    if (department && semester) {
      query = {
        $and: [
          { endDate: { $gte: new Date() } },
          {
            $or: [
              {
                $and: [
                  { visibleTo: { $in: ["student"] } }, // Check if "student" is in the visibleTo array
                  { 
                    $or: [
                      { createdBy: "principal" }, // Principal announcements to all students
                      { createdBy: { $exists: false } }, // Old announcements without createdBy
                      { semester: { $exists: false } }, // General announcements without semester
                      { semester: null }, // General announcements with null semester
                      { semester: "" }, // General announcements with empty semester
                    ]
                  }
                ]
              }, // Regular student announcements (excluding HOD and CC)
              {
                $and: [
                  { createdBy: "hod" },
                  { department: department }, // Only from same department
                  {
                    $or: [
                      { semester: { $exists: false } }, // HOD announcements without semester restriction
                      { semester: null },
                      { semester: "" },
                      { semester: semester }, // HOD announcements for specific semester
                    ]
                  }
                ]
              }, // HOD announcements from same department and semester
              {
                $and: [
                  { createdBy: "cc" }, // CC announcements
                  { department: department }, // Only from same department
                  { semester: semester }, // Only for specific semester selected by CC
                ]
              }, // CC announcements for same department and specific semester
              {
                $and: [
                  { visibleTo: { $in: ["student"] } }, // Check if "student" is in the visibleTo array
                  { semester: semester }, // Announcements targeted to this semester
                  {
                    $or: [
                      { department: { $exists: false } }, // No department restriction
                      { department: null },
                      { department: "" },
                      { department: department }, // Same department
                    ]
                  }
                ]
              }, // Semester-specific announcements
            ],
          },
        ],
      };
    } else if (department) {
      // Fallback for when only department is provided
      query = {
        $and: [
          { endDate: { $gte: new Date() } },
          {
            $or: [
              {
                $and: [
                  { visibleTo: { $in: ["student"] } }, // Check if "student" is in the visibleTo array
                  { 
                    $or: [
                      { createdBy: "principal" }, // Principal announcements to students
                      { createdBy: { $exists: false } }, // Old announcements without createdBy
                      { createdBy: { $ne: "hod" } } // Non-HOD announcements to students
                    ]
                  }
                ]
              }, // Regular student announcements (excluding HOD)
              {
                $and: [
                  { createdBy: "hod" },
                  { department: department }, // Only from same department
                ]
              }, // HOD announcements from same department only
            ],
          },
        ],
      };
    }
    
    console.log("Student query being used:", JSON.stringify(query, null, 2));
    const announcements = await Announcement.find(query).sort({ date: -1 });
    console.log(`Found ${announcements.length} student announcements`);
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

    console.log("Dashboard:", dashboard, "req.query:", JSON.stringify(req.query));

    const validDashboards = [
      "student",
      "teaching_staff",
      "non_teaching_staff",
      "hod",
      "principal",
      "cc",
      "teacher",
    ];
    if (!validDashboards.includes(dashboard)) {
      return res.status(400).json({ error: "Invalid dashboard" });
    }

    let query = {
      visibleTo: { $in: [dashboard] },
      endDate: { $gte: new Date() },
    };

    // Department filtering logic - only apply if department is provided
    if (
      department &&
      (dashboard === "teaching_staff" || dashboard === "non_teaching_staff")
    ) {
      console.log(`🔍 Building complex query for ${dashboard} with department: ${department}`);
      
      // For teaching and non-teaching staff, show:
      // 1. Principal announcements (no department restriction)
      // 2. HOD announcements from their department that EXACTLY match this role
      // 3. Direct announcements to this role from same department
      // 4. Old announcements without createdBy field (backward compatibility)
      query = {
        $and: [
          { endDate: { $gte: new Date() } },
          {
            $or: [
              { createdBy: "principal" }, // Principal announcements (visible to all)
              {
                $and: [
                  { createdBy: "hod" }, 
                  { department: department },
                  { visibleTo: { $in: [dashboard] } } // HOD announcements that include this EXACT role
                ]
              }, // HOD announcements from same department
              {
                $and: [
                  { visibleTo: { $in: [dashboard] } }, // Must include this exact role
                  { 
                    $or: [
                      { department: department }, // Same department
                      { department: { $exists: false } }, // No department specified
                      { createdBy: "principal" } // Principal announcements
                    ]
                  }
                ]
              }, // Direct announcements to this role
              { createdBy: { $exists: false } }, // Backward compatibility for old announcements
            ],
          },
        ],
      };
      
      console.log("🔍 Complex query built:", JSON.stringify(query, null, 2));
    } else if (dashboard === "hod") {
      // HOD can see all their own announcements + Principal announcements + announcements visible to HOD
      if (department) {
        query = {
          $and: [
            { endDate: { $gte: new Date() } },
            {
              $or: [
                { createdBy: "principal" }, // Principal announcements
                {
                  $and: [{ createdBy: "hod" }, { department: department }]
                }, // All HOD announcements from same department (regardless of visibleTo)
                {
                  $and: [{ visibleTo: "hod" }, { department: department }]
                }, // Announcements specifically visible to HOD from same department
                { createdBy: { $exists: false } }, // Backward compatibility
              ],
            },
          ],
        };
      } else {
        query = {
          $and: [
            { endDate: { $gte: new Date() } },
            {
              $or: [
                { createdBy: "principal" }, // Principal announcements
                { createdBy: "hod" }, // All HOD announcements
                { visibleTo: "hod" }, // Announcements visible to HOD
                { createdBy: { $exists: false } }, // Backward compatibility
              ],
            },
          ],
        };
      }
    } else if (dashboard === "cc") {
      console.log("Course Coordinator dashboard requested with department:", department);
      // Course Coordinator can see:
      // 1. Their own announcements (createdBy: "cc")
      // 2. Principal announcements
      // 3. HOD announcements from their department that specifically include "cc" role
      if (department) {
        query = {
          $and: [
            { endDate: { $gte: new Date() } },
            {
              $or: [
                { createdBy: "principal" }, // Principal announcements
                { createdBy: "cc" }, // CC's own announcements
                {
                  $and: [
                    { createdBy: "hod" }, 
                    { department: department },
                    { visibleTo: { $in: ["cc"] } } // HOD announcements that include CC role
                  ]
                },
                {
                  $and: [
                    { visibleTo: { $in: ["cc"] } }, // Direct announcements to CC
                    {
                      $or: [
                        { department: department },
                        { department: { $exists: false } },
                        { createdBy: "principal" }
                      ]
                    }
                  ]
                },
                { createdBy: { $exists: false } }, // Backward compatibility
              ],
            },
          ],
        };
      } else {
        // No department filter - show CC's own announcements + Principal announcements + direct CC announcements
        query = {
          $and: [
            { endDate: { $gte: new Date() } },
            {
              $or: [
                { createdBy: "principal" }, // Principal announcements
                { createdBy: "cc" }, // CC's own announcements
                { visibleTo: { $in: ["cc"] } }, // Announcements visible to CC
                { createdBy: { $exists: false } }, // Backward compatibility
              ],
            },
          ],
        };
      }
    } else if (dashboard === "teacher") {
      console.log("Teacher compose page requested with department:", department);
      // Teacher compose page: Only show teacher's own created announcements
      // Don't show HOD or Principal announcements here - those should be viewed in the main teacher dashboard
      query = {
        $and: [
          { endDate: { $gte: new Date() } },
          { createdBy: "teacher" } // Only teacher-created announcements
        ]
      };
    }
    // For principal, student, and cc - no department filtering needed (existing behavior)
    // Also fallback for cases where no department is provided

    console.log("Query being used:", JSON.stringify(query, null, 2));
    const announcements = await Announcement.find(query).sort({ date: -1 });
    console.log(`Found ${announcements.length} announcements`);
    
    // Debug: Log each announcement found
    announcements.forEach((ann, index) => {
      console.log(`📢 Announcement ${index + 1}:`, {
        title: ann.title,
        createdBy: ann.createdBy,
        createdById: ann.createdById || ann.employeeId || ann.creatorId,
        department: ann.department,
        visibleTo: ann.visibleTo,
        endDate: ann.endDate.toISOString()
      });
    });

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
      semester,
      createdById,
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

    // For CC announcements, department and semester are required
    if (createdBy === "cc" && (!department || !semester)) {
      return res
        .status(400)
        .json({ error: "Department and semester are required for CC announcements" });
    }

    // Update visibleTo based on creator role
    let updatedVisibleTo;
    if (createdBy === "principal") {
      // Principal announcements can be visible to anyone they select + always include hod and principal
      updatedVisibleTo = [...new Set([...visibleTo, "hod", "principal"])];
    } else if (createdBy === "hod") {
      // HOD announcements keep exactly the selected roles (don't auto-add hod/principal)
      updatedVisibleTo = visibleTo;
    } else if (createdBy === "cc") {
      // CC announcements keep exactly the selected roles (don't auto-add hod/principal)
      updatedVisibleTo = visibleTo;
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
      department: createdBy === "hod" || createdBy === "cc" ? department : null, // Store department for HOD and CC announcements
      semester: createdBy === "cc" ? semester : null, // Store semester for CC announcements
      createdBy,
      createdById: createdById || null,
    });

    await announcement.save();
    res.status(201).json(announcement);
  } catch (err) {
    console.error("Error creating announcement:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
