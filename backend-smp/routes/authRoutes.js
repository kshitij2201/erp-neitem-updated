import express from "express";
const router = express.Router();
import {
  login,
  getUserProfile,
  changePassword,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { studentLogin } from "../controllers/studentAuthController.js";

// Auth routes with available functions
router.post("/login", login);
router.get("/profile", protect, getUserProfile);
router.post("/student-login", studentLogin);
router.post("/change-password", protect, changePassword);

export default router;
