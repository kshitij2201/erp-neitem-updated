import express from 'express';
import { getExamFees, updateExamFee } from '../controllers/examFeesController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/exam-fees', protect, getExamFees);
router.put('/exam-fees/update', protect, updateExamFee);

export default router;