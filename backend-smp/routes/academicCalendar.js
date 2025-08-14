import express from "express";
import {
  createAcademicYear,
  createSemester,
  createSubjectSchedule,
  getFacultyCalendar,
  updateLectureProgress,
  getDepartmentCalendar,
  logLecture,
  getActiveAcademicYear
} from "../controllers/academicCalendarNewController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Create academic year
router.post("/academic-year", protect, createAcademicYear);

// Create semester
router.post("/semester", protect, createSemester);

// Create subject schedule
router.post("/subject-schedule", protect, createSubjectSchedule);

// Get faculty calendar
router.get("/faculty/:facultyId", protect, getFacultyCalendar);

// Get department calendar
router.get("/department/:departmentId", protect, getDepartmentCalendar);

// Get active academic year
router.get("/active-year", protect, getActiveAcademicYear);

// Update lecture progress
router.patch("/lecture-progress/:scheduleId", protect, updateLectureProgress);

// Log lecture
router.post("/log-lecture", protect, logLecture);

export default router;
