import express from 'express';
import {
  getAllSalaryRecords,
  getSalaryRecordById,
  addSalaryRecord,
  updateSalaryRecord,
  updateSalaryById,
  deleteSalaryById,
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

// Update a salary record by document _id (used by frontend edit)
router.put('/byId/:id', updateSalaryById);

// Delete a salary record by document _id
router.delete('/byId/:id', deleteSalaryById);

export default router;