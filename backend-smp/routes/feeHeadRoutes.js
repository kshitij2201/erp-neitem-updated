import express from "express";
const router = express.Router();
import FeeHead from "../models/FeeHead.js";
import Student from "../models/StudentManagement.js";
// import Stream from "../models/Stream";

// GET: all fee heads
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    const feeHeads = await FeeHead.find(query);
    res.json(feeHeads);
  } catch (err) {
    res.status(500).json({ message: "Error fetching fee heads" });
  }
});

// GET: applicable fee heads for a student
router.get("/applicable/:studentId", async (req, res) => {
  try {
    console.log(`🔍 Getting applicable fee heads for student ID: ${req.params.studentId}`);
    
    // First try to find student in local database
    let student = await Student.findById(req.params.studentId).populate("stream");
    console.log(`Student found in local DB: ${!!student}`);
    
    // If student not found locally, create a mock student object based on remote data structure
    if (!student) {
      student = {
        _id: req.params.studentId,
        casteCategory: "Open", // Default caste category
        stream: null,
        feesPaid: 0,
        currentSemester: req.query.semester ? parseInt(req.query.semester) : null, // Get semester from query params
      };
      console.log(`Created mock student:`, student);
    }

    const allHeads = await FeeHead.find();
    console.log(`Total fee heads in database: ${allHeads.length}`);
    
    if (allHeads.length > 0) {
      console.log(`Sample fee head:`, allHeads[0]);
    }

    const applicable = allHeads.filter((head) => {
      if (head.applyTo === "all") return true;

      const matchStream = head.filters?.stream
        ? String(head.filters.stream) === String(student.stream?._id)
        : true;

      // Map remote caste categories to our fee head filters
      let studentCaste = student.casteCategory || "Open";
      
      // Normalize caste category mapping
      const casteMapping = {
        'sc': 'SC',
        'st': 'ST', 
        'obc': 'OBC',
        'general': 'Open',
        'open': 'Open'
      };
      
      const normalizedCaste = casteMapping[studentCaste.toLowerCase()] || 'Open';

      const matchCaste = head.filters?.casteCategory
        ? head.filters.casteCategory.toLowerCase() === normalizedCaste.toLowerCase()
        : true;

      // Add semester filtering
      const studentSemester = student.currentSemester || (req.query.semester ? parseInt(req.query.semester) : null);
      const matchSemester = head.filters?.semester
        ? head.filters.semester === studentSemester
        : true; // If no semester filter on fee head, apply to all semesters

      return matchStream && matchCaste && matchSemester;
    });

    console.log(`Applicable fee heads: ${applicable.length}`);
    res.json(applicable);
  } catch (err) {
    console.error("Fee match error:", err);
    res.status(500).json({ message: "Error matching fee heads" });
  }
});

// POST: create new fee head
router.post("/", async (req, res) => {
  try {
    const feeHead = new FeeHead(req.body);
    await feeHead.save();
    res.status(201).json(feeHead);
  } catch (err) {
    res.status(500).json({ message: "Error creating fee head" });
  }
});

// PUT: update fee head
router.put("/:id", async (req, res) => {
  try {
    const feeHead = await FeeHead.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(feeHead);
  } catch (err) {
    res.status(500).json({ message: "Error updating fee head" });
  }
});

// DELETE: delete fee head
router.delete("/:id", async (req, res) => {
  try {
    const feeHead = await FeeHead.findByIdAndDelete(req.params.id);

    if (!feeHead) {
      return res.status(404).json({ message: "Fee head not found" });
    }

    res.json({ message: "Fee head deleted successfully and student fees updated" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting fee head" });
  }
});

export default router;

