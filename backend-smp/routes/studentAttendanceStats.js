import express from "express";
import { getMonthlyStats, getOverallStats } from "../controllers/studentAttendanceStatsController.js";
import { protectStudent } from "../middleware/studentAuth.js";

const router = express.Router();

// GET /api/student-attendance/:studentId/:subjectId/monthly?month=6&year=2025
router.get("/:studentId/:subjectId/monthly", protectStudent, getMonthlyStats);
// GET /api/student-attendance/:studentId/:subjectId/overall
router.get("/:studentId/:subjectId/overall", protectStudent, getOverallStats);

export default router;
