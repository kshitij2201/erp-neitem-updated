import express from "express";
import {
  createTask,
  getAllTasks,
  getPendingTasks,
  getSentTasks,
  getTaskById,
  updateTask,
  approveByHOD,
  approveByFaculty,
  getPendingHandoverForHOD,
  getPendingHandoverForFaculty,
} from "../controllers/taskController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Define routes
router.post("/", createTask);
router.get("/", getAllTasks);
router.get("/pending/:receiverName", getPendingTasks);
router.get("/sent/:employeeId", getSentTasks);
router.get("/:id", getTaskById);
router.put("/:id", updateTask);

// HOD approval for charge handover
router.put("/:id/approve-hod", protect, approveByHOD);

// Faculty approval for charge handover
router.put("/:id/approve-faculty", protect, approveByFaculty);

// HOD: Get all pending handover requests for their department
router.get("/pending-handover/hod", protect, getPendingHandoverForHOD);

// Faculty: Get all pending handover requests for them
router.get("/pending-handover/faculty", protect, getPendingHandoverForFaculty);

// Debug endpoint to test receiver matching
router.get("/debug-receiver/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const Task = (await import("../models/taskModel.js")).default;

    console.log("Debug receiver endpoint called with userId:", userId);

    // Get all tasks and check matching
    const allTasks = await Task.find({}).sort({ date: -1 });

    const matchingTasks = allTasks.filter(
      (task) => task.receiverId === userId || task.receiverEmployeeId === userId
    );

    res.json({
      userId,
      totalTasks: allTasks.length,
      matchingTasks: matchingTasks.length,
      tasks: allTasks.map((task) => ({
        id: task._id,
        receiverId: task.receiverId,
        receiverEmployeeId: task.receiverEmployeeId,
        receiverName: task.receiverName,
        status: task.status,
        matches:
          task.receiverId === userId || task.receiverEmployeeId === userId,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
