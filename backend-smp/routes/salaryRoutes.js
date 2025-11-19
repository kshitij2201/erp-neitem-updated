import express from 'express';
import {
  getAllSalaryRecords,
  getSalaryRecordById,
  addSalaryRecord,
  updateSalaryRecord,
  getTotalSalary
} from '../controllers/salaryController.js';

const router = express.Router();

// Get all salary records
router.get('/', getAllSalaryRecords);

// Get total salary amount
router.get('/total', getTotalSalary);

// Get a specific salary record by employeeId
router.get('/:id', getSalaryRecordById);

// Create a new salary record
router.post('/', addSalaryRecord);

// Update a salary record by employeeId
router.put('/:id', updateSalaryRecord);

export default router;