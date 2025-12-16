import express from 'express';
const router = express.Router();
import {
  createExtraStudent,
  getExtraStudents,
  getExtraStudentById,
  updateExtraStudent,
  deleteExtraStudent
} from '../controllers/extraStudentController.js';

// Note: protect middleware is already applied at mount time in server.js
// No need to apply it again on individual routes

// GET all extra students
router.get('/', getExtraStudents);

// GET extra student by ID
router.get('/:id', getExtraStudentById);

// POST create new extra student
router.post('/', createExtraStudent);

// PUT update extra student
router.put('/:id', updateExtraStudent);

// DELETE extra student
router.delete('/:id', deleteExtraStudent);

export default router;