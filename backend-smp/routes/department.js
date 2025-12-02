import express from "express";
import Department from "../models/AcademicDepartment.js";

const router = express.Router();

// Create department with associated stream
router.post("/", async (req, res) => {
  try {
    const { name, stream } = req.body;
    if (!name || !stream) {
      return res.status(400).json({ error: "Name and stream are required." });
    }
    const dept = new Department({ name, stream });
    await dept.save();
    res.status(201).json(dept);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all departments (for dashboard)
router.get("/all", async (req, res) => {
  try {
    const departments = await Department.find({}).populate("stream", "name");
    
    const departmentList = departments.map(dept => ({
      name: dept.name,
      stream: dept.stream?.name || "Unknown",
      id: dept._id
    }));

    res.json({ 
      departments, 
      total: departments.length,
      departmentList
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get departments by stream name
router.get("/by-stream/:streamName", async (req, res) => {
  try {
    const { streamName } = req.params;
    
    // First find the stream by name
    const Stream = (await import("../models/Stream.js")).default;
    const stream = await Stream.findOne({ name: streamName });
    
    if (!stream) {
      return res.status(404).json({ error: "Stream not found" });
    }
    
    // Get departments for this stream
    const departments = await Department.find({ stream: stream._id }).select('name');
    const departmentNames = departments.map(dept => dept.name);
    
    res.json({ 
      stream: streamName,
      departments: departmentNames,
      count: departmentNames.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update department
router.put("/:id", async (req, res) => {
  try {
    const { name, stream } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (stream) updateData.stream = stream;

    const dept = await Department.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });
    res.json(dept);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete department
router.delete("/:id", async (req, res) => {
  try {
    await Department.findByIdAndDelete(req.params.id);
    res.json({ message: "Department deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
