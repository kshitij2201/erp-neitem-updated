import express from "express";
import {
  createAcademicYear,
  createSemester,
  createSubjectSchedule,
  getFacultyCalendar,
  updateLectureProgress,
  getDepartmentCalendar,
  logLecture,
  getActiveAcademicYear,
} from "../controllers/academicCalendarNewController.js";
import {
  getAcademicCalendars,
  createAcademicCalendar,
  getAcademicCalendarById,
  updateAcademicCalendar,
  deleteAcademicCalendar,
  publishAcademicCalendar,
  addTopicToCalendar,
  updateTopicInCalendar,
  deleteTopicFromCalendar,
  getFacultyBySubject,
  getSubjectsByDepartment,
  getFacultyByDepartment,
} from "../controllers/academicCalendarController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Academic Calendar CRUD operations (for frontend)
router.get("/", protect, getAcademicCalendars);
router.post("/", protect, createAcademicCalendar);
router.get("/:id", getAcademicCalendarById);
router.put("/:id", protect, updateAcademicCalendar);
router.delete("/:id", protect, deleteAcademicCalendar);
router.patch("/:id/publish", protect, publishAcademicCalendar);

// Topic management
router.post("/:id/topics", protect, addTopicToCalendar);
router.patch("/:id/topics/:topicId", protect, updateTopicInCalendar);
router.delete("/:id/topics/:topicId", protect, deleteTopicFromCalendar);

// Helper endpoints for dropdowns
router.get("/faculty/subject/:subjectId", protect, getFacultyBySubject);
router.get("/subjects/department/:department", getSubjectsByDepartment);
router.get("/faculty/department/:department", getFacultyByDepartment);

// Academic Year/Semester/Schedule management (original endpoints)
router.post("/academic-year", protect, createAcademicYear);
router.post("/semester", protect, createSemester);
router.post("/subject-schedule", protect, createSubjectSchedule);
router.get("/faculty/:facultyId", getFacultyCalendar);
router.get("/department/:departmentId", getDepartmentCalendar);
router.get("/active-year", getActiveAcademicYear);
router.patch("/lecture-progress/:scheduleId", protect, updateLectureProgress);
router.post("/log-lecture", protect, logLecture);

export default router;
