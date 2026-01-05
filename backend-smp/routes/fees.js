import express from 'express';
import { getFees, updateFee } from '../controllers/feesController.js';
import { protect } from '../middleware/auth.js';
import FeeSummary from '../models/FeeSummary.js';
import Student from '../models/StudentManagement.js';

const router = express.Router();

router.get('/', protect, getFees);
router.put('/update', protect, updateFee);

// GET fee summaries - make accessible without strict authentication
router.get('/summaries', async (req, res) => {
  try {
    const { studentId } = req.query;
    let query = {};
    if (studentId) {
      // Find student by studentId string
      const student = await Student.findOne({ studentId: studentId });
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      query.studentId = student._id;
    }
    const feeSummaries = await FeeSummary.find(query)
      .populate({
        path: 'studentId',
        model: 'Student',
        select: 'firstName middleName lastName studentId stream department semester',
        populate: [
          { path: 'stream', select: 'name code' },
          { path: 'department', select: 'name code' },
          { path: 'semester', select: 'number name' }
        ]
      })
      .lean();
    res.json(feeSummaries);
  } catch (err) {
    console.error('Error fetching fee summaries:', err);
    res.status(500).json({ error: 'Failed to fetch fee summaries', details: err.message });
  }
});

export default router;