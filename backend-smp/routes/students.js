import express from 'express';
const router = express.Router();
import Student from '../models/StudentManagement.js';
import FeeHead from '../models/FeeHead.js';
import Payment from '../models/Payment.js';
import mongoose from 'mongoose';
import { protect } from '../middleware/auth.js';

// GET all students (protected)
router.get('/', protect, async (req, res) => {
  try {
    const { department, program, academicStatus, search, page = 1, limit = 10 } = req.query;
    
    let query = {};
    
    // Filter by department - handle both string and ObjectId
    if (department) {
      if (mongoose.Types.ObjectId.isValid(department)) {
        query.department = department;
      } else {
        // Find department by name first
        try {
          // First try exact match
          let dept = await mongoose.model('AcademicDepartment').findOne({
            name: { $regex: `^${department}$`, $options: 'i' }
          });
          
          // If not found, try common typo corrections
          if (!dept) {
            const departmentVariations = [
              department,
              department.replace('Mechancial', 'Mechanical'), // Fix common typo
              department.replace('Mechnical', 'Mechanical'),   // Another typo
              department.replace('Machanical', 'Mechanical'),  // Another typo
            ];
            
            for (const variation of departmentVariations) {
              dept = await mongoose.model('AcademicDepartment').findOne({
                name: { $regex: `^${variation}$`, $options: 'i' }
              });
              if (dept) {
                console.log(`[Students] Found department using variation: ${variation}`);
                break;
              }
            }
          }
          
          if (dept) {
            query.department = dept._id;
            console.log(`[Students] Department filter applied: ${dept.name} (${dept._id})`);
          } else {
            console.log(`[Students] No department found for: ${department} - skipping department filter`);
            // Skip department filter if not found
          }
        } catch (err) {
          console.log("Error finding department:", err.message);
          // Skip department filter on error
        }
      }
    }
    
    // Filter by program
    if (program) {
      query.program = { $regex: program, $options: 'i' };
    }
    
    // Filter by academic status
    if (academicStatus) {
      query.academicStatus = academicStatus;
    }
    
    // Search by student name, studentId, or enrollmentNumber
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { middleName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { enrollmentNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const total = await Student.countDocuments(query);
    const students = await Student.find(query)
      .populate('stream', 'name code')
      .populate('department', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    res.json({ data: students, total });
  } catch (err) {
    console.error('Error fetching students:', err);
    res.status(500).json({ message: 'Error fetching students' });
  }
});

// GET student statistics (protected)
router.get('/stats/overview', protect, async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const activeStudents = await Student.countDocuments({ academicStatus: 'Active' });
    
    const departmentStats = await Student.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const enrollmentYearStats = await Student.aggregate([
      {
        $group: {
          _id: '$enrollmentYear',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        totalStudents,
        activeStudents,
        departmentStats,
        enrollmentYearStats
      }
    });
  } catch (err) {
    console.error('Error fetching student stats:', err);
    res.status(500).json({ message: 'Error fetching student statistics' });
  }
});

// GET: pending fees for a specific student (must come before /:id route) (protected)
router.get('/:id/pending-fees', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { academicYear } = req.query;
    
    // Validate student ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid student ID format' });
    }
    
    // Get student data
    const student = await Student.findById(id).populate('stream');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Get all fee heads
    const allFeeHeads = await FeeHead.find();
    
    if (!allFeeHeads || allFeeHeads.length === 0) {
      return res.json([]); // Return empty array if no fee heads exist
    }
    
    // Filter applicable fee heads for this student
    const applicableHeads = allFeeHeads.filter((head) => {
      if (head.applyTo === "all") return true;

      const matchStream = head.filters?.stream
        ? String(head.filters.stream) === String(student.stream?._id)
        : true;

      // Normalize caste category mapping
      let studentCaste = student.casteCategory || "Open";
      const casteMapping = {
        'sc': 'SC',
        'st': 'ST', 
        'obc': 'OBC',
        'general': 'Open',
        'open': 'Open'
      };
      const normalizedCaste = casteMapping[studentCaste.toLowerCase()] || 'Open';

      const matchCaste = head.filters?.casteCategory
        ? head.filters.casteCategory.toLowerCase() === normalizedCaste.toLowerCase()
        : true;

      return matchStream && matchCaste;
    });

    // Get student's payment history for applicable fee heads
    const payments = await Payment.find({ 
      studentId: id,
      feeHead: { $in: applicableHeads.map(h => h._id) }
    });

    // Calculate pending fees
    const pendingFeesCalc = applicableHeads.map(feeHead => {
      const totalPaid = payments
        .filter(payment => String(payment.feeHead) === String(feeHead._id))
        .reduce((sum, payment) => sum + payment.amount, 0);
      
      const pendingAmount = feeHead.amount - totalPaid;
      
      if (pendingAmount > 0) {
        return {
          feeHead: feeHead.title,
          feeHeadId: feeHead._id,
          totalAmount: feeHead.amount,
          paidAmount: totalPaid,
          pendingAmount: pendingAmount,
          dueDate: feeHead.dueDate || null,
          description: feeHead.description
        };
      }
      return null;
    }).filter(fee => fee !== null);

    res.json(pendingFeesCalc);
  } catch (err) {
    console.error('Error calculating pending fees for student:', err);
    console.error('Error details:', err.stack);
    res.status(500).json({ 
      message: 'Error calculating pending fees',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// GET: semester fees for a specific student and semester (protected)
router.get('/:id/semester-fees/:semester', protect, async (req, res) => {
  try {
    const { id, semester } = req.params;
    const { academicYear } = req.query;
    
    // Validate student ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid student ID format' });
    }
    
    // Validate semester
    const semesterNum = parseInt(semester);
    if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 8) {
      return res.status(400).json({ message: 'Invalid semester. Must be between 1 and 8.' });
    }
    
    // Get student data
    const student = await Student.findById(id).populate('stream');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Get all fee heads
    const allFeeHeads = await FeeHead.find();
    
    if (!allFeeHeads || allFeeHeads.length === 0) {
      return res.json([]); // Return empty array if no fee heads exist
    }
    
    // Filter applicable fee heads for this student
    const applicableHeads = allFeeHeads.filter((head) => {
      if (head.applyTo === "all") return true;

      const matchStream = head.filters?.stream
        ? String(head.filters.stream) === String(student.stream?._id)
        : true;

      // Normalize caste category mapping
      let studentCaste = student.casteCategory || "Open";
      const casteMapping = {
        'sc': 'SC',
        'st': 'ST', 
        'obc': 'OBC',
        'general': 'Open',
        'open': 'Open'
      };
      const normalizedCaste = casteMapping[studentCaste.toLowerCase()] || 'Open';

      const matchCaste = head.filters?.casteCategory
        ? head.filters.casteCategory.toLowerCase() === normalizedCaste.toLowerCase()
        : true;

      return matchStream && matchCaste;
    });

    // Get student's payment history for this semester
    const payments = await Payment.find({ 
      studentId: id,
      semester: semesterNum,
      feeHead: { $in: applicableHeads.map(h => h._id) }
    });

    // Calculate semester fees
    const semesterFeesCalc = applicableHeads.map(feeHead => {
      const totalPaid = payments
        .filter(payment => String(payment.feeHead) === String(feeHead._id) && payment.semester === semesterNum)
        .reduce((sum, payment) => sum + payment.amount, 0);
      
      const pendingAmount = feeHead.amount - totalPaid;
      
      return {
        feeHead: feeHead.title,
        feeHeadId: feeHead._id,
        totalAmount: feeHead.amount,
        paidAmount: totalPaid,
        pendingAmount: Math.max(0, pendingAmount),
        semester: semesterNum,
        description: feeHead.description
      };
    });

    res.json(semesterFeesCalc);
  } catch (err) {
    console.error('Error calculating semester fees for student:', err);
    console.error('Error details:', err.stack);
    res.status(500).json({ 
      message: 'Error calculating semester fees',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// Unprotected endpoint for basic student data (for public dashboards) - MUST be before /:id route
router.get('/public', async (req, res) => {
  try {
    const { search, limit = 10, page = 1, department } = req.query;
    
    let query = {};
    
    // Filter by department
    if (department) {
      query.department = { $regex: department, $options: 'i' };
    }
    
    // Search by student name, studentId, or enrollmentNumber
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { enrollmentNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const students = await Student.find(query)
      .select('firstName middleName lastName studentId enrollmentNumber email department stream gender casteCategory admissionType')
      .populate('department', 'name')
      .populate('stream', 'name')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
      
    const total = await Student.countDocuments(query);
    
    res.json({
      students,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('Error fetching public student data:', err);
    res.status(500).json({ error: 'Failed to fetch student data' });
  }
});

// GET student by ID (protected)
router.get('/:id', protect, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate('stream');
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    res.json(student);
  } catch (err) {
    console.error('Error fetching student:', err);
    res.status(500).json({ message: 'Error fetching student' });
  }
});

// POST create new student (protected)
router.post('/', protect, async (req, res) => {
  try {
    const student = new Student(req.body);
    await student.save();
    res.status(201).json(student);
  } catch (err) {
    console.error('Error creating student:', err);
    res.status(500).json({ message: 'Error creating student' });
  }
});

// PUT update student (protected)
router.put('/:id', protect, async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(student);
  } catch (err) {
    console.error('Error updating student:', err);
    res.status(500).json({ message: 'Error updating student' });
  }
});

// DELETE student (protected)
router.delete('/:id', protect, async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ message: 'Student deleted successfully' });
  } catch (err) {
    console.error('Error deleting student:', err);
    res.status(500).json({ message: 'Error deleting student' });
  }
});

// Dashboard aggregator (protected)
router.get('/fees/status', protect, async (req, res) => {
  try {
    const students = await Student.find().populate("stream");
    let pendingFees = 0;
    let totalFeePaid = 0;
    let totalFeeExpected = 0;

    // Get all fee heads to filter applicable ones per student
    const allFeeHeads = await FeeHead.find();

    for (const s of students) {
      // Filter applicable fee heads for this student (same logic as /api/fee-heads/applicable/:studentId)
      const applicableHeads = allFeeHeads.filter((head) => {
        if (head.applyTo === "all") return true;

        const matchStream = head.filters?.stream
          ? String(head.filters.stream) === String(s.stream?._id)
          : true;

        // Normalize caste category mapping (same as feeHeadRoutes.js)
        let studentCaste = s.casteCategory || "Open";
        const casteMapping = {
          'sc': 'SC',
          'st': 'ST', 
          'obc': 'OBC',
          'general': 'Open',
          'open': 'Open'
        };
        const normalizedCaste = casteMapping[studentCaste.toLowerCase()] || 'Open';

        const matchCaste = head.filters?.casteCategory
          ? head.filters.casteCategory.toLowerCase() === normalizedCaste.toLowerCase()
          : true;

        return matchStream && matchCaste;
      });

      // Calculate total applicable fee for this student (same as frontend logic)
      const studentTotal = applicableHeads.reduce((sum, h) => sum + (h.amount || 0), 0);
      const paid = s.feesPaid || 0;
      const pending = studentTotal - paid; // Same as frontend: total - paid (no Math.max)
      
      pendingFees += pending;
      totalFeePaid += paid;
      totalFeeExpected += studentTotal;
    }

    res.json({ pendingFees, totalFeePaid, totalFeeExpected });
  } catch (err) {
    console.error('Error calculating fees:', err);
    res.status(500).json({ error: 'Failed to calculate fees' });
  }
});

// Filtered financial summary by department (unprotected)
router.get('/financial-summary/filtered', async (req, res) => {
  try {
    const { department } = req.query;
    
    let studentQuery = {};
    if (department) {
      studentQuery.department = { $regex: department, $options: 'i' };
    }
    
    const students = await Student.find(studentQuery).populate("stream department");
    
    if (students.length === 0) {
      return res.json({
        totalFeesCollected: 0,
        pendingFees: 0,
        totalExpenses: 0,
        totalRevenue: 0,
        netBalanceStudentFees: 0,
        pendingCollection: 0,
        facultySalaries: 0,
        studentCount: 0
      });
    }

    let totalFeesCollected = 0;
    let pendingFees = 0;
    let totalExpenses = 0;
    let totalRevenue = 0;
    let netBalanceStudentFees = 0;
    let pendingCollection = 0;
    let facultySalaries = 0;

    // Get all fee heads to filter applicable ones per student
    const allFeeHeads = await FeeHead.find();

    for (const student of students) {
      // Filter applicable fee heads for this student
      const applicableHeads = allFeeHeads.filter((head) => {
        if (head.applyTo === "all") return true;

        const matchStream = head.filters?.stream
          ? String(head.filters.stream) === String(student.stream?._id)
          : true;

        // Normalize caste category mapping
        let studentCaste = student.casteCategory || "Open";
        const casteMapping = {
          'sc': 'SC',
          'st': 'ST', 
          'obc': 'OBC',
          'general': 'Open',
          'open': 'Open'
        };
        const normalizedCaste = casteMapping[studentCaste.toLowerCase()] || 'Open';

        const matchCaste = head.filters?.casteCategory
          ? head.filters.casteCategory.toLowerCase() === normalizedCaste.toLowerCase()
          : true;

        return matchStream && matchCaste;
      });

      // Calculate fees for this student
      const studentTotalFees = applicableHeads.reduce((sum, h) => sum + (h.amount || 0), 0);
      const feesPaid = student.feesPaid || 0;
      const studentPendingFees = Math.max(0, studentTotalFees - feesPaid);
      
      totalFeesCollected += feesPaid;
      pendingFees += studentPendingFees;
      pendingCollection += studentPendingFees;
    }

    // For expenses and faculty salaries, we might need to filter by department too
    // For now, return 0 as these are not department-specific
    totalExpenses = 0;
    facultySalaries = 0;
    totalRevenue = totalFeesCollected;
    netBalanceStudentFees = totalFeesCollected - pendingFees;

    res.json({
      totalFeesCollected,
      pendingFees,
      totalExpenses,
      totalRevenue,
      netBalanceStudentFees,
      pendingCollection,
      facultySalaries,
      studentCount: students.length
    });
  } catch (err) {
    console.error('Error calculating filtered financial summary:', err);
    res.status(500).json({ error: 'Failed to calculate financial summary' });
  }
});

export default router;