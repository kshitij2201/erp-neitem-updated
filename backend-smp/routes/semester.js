import express from "express";
import Semester from "../models/Semester.js";
import Subject from "../models/AdminSubject.js";
import Student from "../models/StudentManagement.js";

const router = express.Router();

// GET all semesters
router.get("/", async (req, res) => {
  try {
    const semesters = await Semester.find()
      .sort({ number: 1 })
      .populate("subjects", "name department");
    res.json(semesters);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch semesters" });
  }
});

// POST create a new semester
router.post("/", async (req, res) => {
  const { number, subjectIds } = req.body;

  if (!number || number < 1 || number > 9) {
    return res
      .status(400)
      .json({ error: "Semester number must be between 1 and 9" });
  }

  try {
    // Check if semester number already exists
    const existing = await Semester.findOne({ number });
    if (existing) {
      return res.status(409).json({ error: "Semester number already exists" });
    }

    // Validate subjectIds if provided
    let subjects = [];
    if (subjectIds && Array.isArray(subjectIds)) {
      if (subjectIds.length > 0) {
        const subjectDocs = await Subject.find({ _id: { $in: subjectIds } });
        if (subjectDocs.length !== subjectIds.length) {
          return res
            .status(400)
            .json({ error: "One or more subject IDs are invalid" });
        }
        subjects = subjectIds;
      }
    }

    const semester = new Semester({ number, subjects });
    await semester.save();

    // Sync semester field in AdminSubject
    if (subjects.length > 0) {
      await Subject.updateMany({ _id: { $in: subjects } }, { semester: number });
    }

    const populatedSemester = await Semester.findById(semester._id).populate(
      "subjects",
      "name department"
    );
    res.status(201).json(populatedSemester);
  } catch (err) {
    res.status(500).json({ error: "Failed to create semester" });
  }
});

// PUT update semester
router.put("/:id", async (req, res) => {
  const { number, subjectIds } = req.body;

  if (!number || number < 1 || number > 9) {
    return res
      .status(400)
      .json({ error: "Semester number must be between 1 and 9" });
  }

  try {
    const semester = await Semester.findById(req.params.id);
    if (!semester) {
      return res.status(404).json({ error: "Semester not found" });
    }

    // Check if number is taken by another semester
    const existing = await Semester.findOne({
      number,
      _id: { $ne: req.params.id },
    });
    if (existing) {
      return res.status(409).json({ error: "Semester number already exists" });
    }

    // Validate subjectIds if provided
    let subjects = semester.subjects;
    if (subjectIds && Array.isArray(subjectIds)) {
      if (subjectIds.length > 0) {
        const subjectDocs = await Subject.find({ _id: { $in: subjectIds } });
        if (subjectDocs.length !== subjectIds.length) {
          return res
            .status(400)
            .json({ error: "One or more subject IDs are invalid" });
        }
        subjects = subjectIds;
      } else {
        subjects = [];
      }
    }

    const oldSubjects = semester.subjects;
    semester.number = number;
    semester.subjects = subjects;
    await semester.save();

    // Sync semester field in AdminSubject
    const removedSubjects = oldSubjects.filter(id => !subjects.includes(id));
    const addedSubjects = subjects.filter(id => !oldSubjects.includes(id));
    if (removedSubjects.length > 0) {
      await Subject.updateMany({ _id: { $in: removedSubjects } }, { $unset: { semester: 1 } });
    }
    if (addedSubjects.length > 0) {
      await Subject.updateMany({ _id: { $in: addedSubjects } }, { semester: number });
    }

    const populatedSemester = await Semester.findById(semester._id).populate(
      "subjects",
      "name department"
    );
    res.json(populatedSemester);
  } catch (err) {
    res.status(500).json({ error: "Failed to update semester" });
  }
});

// DELETE semester
router.delete("/:id", async (req, res) => {
  try {
    const semester = await Semester.findById(req.params.id);
    if (!semester) {
      return res.status(404).json({ error: "Semester not found" });
    }

    // Check if semester is referenced by any student
    const studentUsingSemester = await Student.findOne({
      $or: [
        { semester: req.params.id },
        { "semesterRecords.semester": req.params.id },
        { "backlogs.semester": req.params.id },
      ],
    });
    if (studentUsingSemester) {
      return res.status(400).json({
        error:
          "Cannot delete semester; it is referenced by one or more students",
      });
    }

    // Sync semester field in AdminSubject before deleting
    await Subject.updateMany({ _id: { $in: semester.subjects } }, { $unset: { semester: 1 } });

    await semester.deleteOne();
    res.json({ message: "Semester deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete semester" });
  }
});

// PATCH sync subjects semester
router.patch("/sync-subjects", async (req, res) => {
  try {
    // Clear all semester fields first
    await Subject.updateMany({}, { $unset: { semester: 1 } });

    // Get all semesters
    const semesters = await Semester.find().populate("subjects");

    // Update each subject's semester based on current assignments
    for (const sem of semesters) {
      if (sem.subjects && sem.subjects.length > 0) {
        await Subject.updateMany(
          { _id: { $in: sem.subjects.map(s => s._id) } },
          { semester: sem.number }
        );
      }
    }

    res.json({ message: "Subjects semester sync completed" });
  } catch (err) {
    res.status(500).json({ error: "Failed to sync subjects semester" });
  }
});

export default router;
