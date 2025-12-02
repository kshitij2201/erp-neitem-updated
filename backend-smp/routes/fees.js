import express from 'express';
import { getFees, updateFee } from '../controllers/feesController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getFees);
router.put('/update', protect, updateFee);

export default router;