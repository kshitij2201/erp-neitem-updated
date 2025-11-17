import express from 'express';
const router = express.Router();
import Student from '../models/StudentManagement.js';
import FeeHead from '../models/FeeHead.js';
import Payment from '../models/Payment.js';
import mongoose from 'mongoose';

// GET all students
router.get('/', async (req, res) => {
  try {
    const { department, program, academicStatus, search, semester, section } = req.query;
    
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
    
    // Filter by semester - handle both ObjectId and number
    if (semester) {
      if (mongoose.Types.ObjectId.isValid(semester)) {
        query.semester = semester;
      } else {
        // Try to find semester by number
        try {
          // For NCAT2017 faculty specifically, if semester is "1", try to find semester "3" instead
          // This is a temporary fix for the CC assignment data issue
          let semesterToSearch = semester;
          if (semester === "1" && req.user && (req.user.employeeId === "NCAT2017" || req.user.firstName === "Chralie")) {
            console.log(`[Students] Adjusting semester from "1" to "3" for NCAT2017 faculty`);
            semesterToSearch = "3";
          }
          
          const semesterDoc = await mongoose.model('Semester').findOne({
            $or: [
              { semesterNumber: parseInt(semesterToSearch) },
              { name: { $regex: semesterToSearch, $options: 'i' } }
            ]
          });
          if (semesterDoc) {
            query.semester = semesterDoc._id;
            console.log(`[Students] Semester filter applied: ${semesterDoc.name || semesterDoc.semesterNumber} (${semesterDoc._id})`);
          } else {
            console.log(`[Students] No semester found for: ${semesterToSearch} (original: ${semester}) - skipping semester filter`);
            // Skip semester filter if not found
          }
        } catch (err) {
          console.log("Error finding semester:", err.message);
          // Skip semester filter on error
        }
      }
    }
    
    // Filter by section - direct string match (case insensitive)
    if (section) {
      query.section = { $regex: `^${section}$`, $options: 'i' };
    }
    
    // Search by name, email, or student ID
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { middleName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { enrollmentNumber: { $regex: search, $options: 'i' } },
        { fatherName: { $regex: search, $options: 'i' } },
        { scholarshipDetails: { $regex: search, $options: 'i' } }
      ];
    }
    
    const students = await Student.find(query)
      .populate('stream', 'name code')
      .populate('department', 'name code')
      .populate('semester', 'semesterNumber name')
      .sort({ createdAt: -1 });
    
    console.log(`[Students Route] Found ${students.length} students matching query:`, {
      query,
      originalParams: { department, semester, section, program, academicStatus, search },
      departmentFilter: department ? "applied" : "none",
      semesterFilter: semester ? "applied" : "none", 
      sectionFilter: section ? "applied" : "none"
    });
    
    // Return students in a consistent format
    res.json({
      success: true,
      data: students,
      message: `Found ${students.length} students`
    });
  } catch (err) {
    console.error('Error fetching students:', err);
    res.status(500).json({ message: 'Error fetching students' });
  }
});

// GET student statistics
router.get('/stats/overview', async (req, res) => {
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

// GET: pending fees for a specific student (must come before /:id route)
router.get('/:id/pending-fees', async (req, res) => {
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

// GET: semester fees for a specific student and semester
router.get('/:id/semester-fees/:semester', async (req, res) => {
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

// GET student by ID
router.get('/:id', async (req, res) => {
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

// POST create new student
router.post('/', async (req, res) => {
  try {
    const student = new Student(req.body);
    await student.save();
    res.status(201).json(student);
  } catch (err) {
    console.error('Error creating student:', err);
    res.status(500).json({ message: 'Error creating student' });
  }
});

// PUT update student
router.put('/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(student);
  } catch (err) {
    console.error('Error updating student:', err);
    res.status(500).json({ message: 'Error updating student' });
  }
});

// DELETE student
router.delete('/:id', async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ message: 'Student deleted successfully' });
  } catch (err) {
    console.error('Error deleting student:', err);
    res.status(500).json({ message: 'Error deleting student' });
  }
});

// Dashboard aggregator
// Dashboard aggregator (for all students, sum all applicable fee heads)
router.get('/fees/status', async (req, res) => {
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

// Additional routes that frontend is trying to access
router.get('/filter', async (req, res) => {
  console.log('[Students Filter Route] Called with params:', req.query);
  // Use the same logic as the main route
  try {
    const { department, program, academicStatus, search, semester, section } = req.query;
    
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
                console.log(`[Students Filter] Found department using variation: ${variation}`);
                break;
              }
            }
          }
          
          if (dept) {
            query.department = dept._id;
            console.log(`[Students Filter] Department filter applied: ${dept.name} (${dept._id})`);
          } else {
            console.log(`[Students Filter] No department found for: ${department} - skipping department filter`);
          }
        } catch (err) {
          console.log("Error finding department:", err.message);
        }
      }
    }
    
    // Filter by semester - handle both ObjectId and number
    if (semester) {
      if (mongoose.Types.ObjectId.isValid(semester)) {
        query.semester = semester;
      } else {
        try {
          let semesterToSearch = semester;
          if (semester === "1" && req.user && (req.user.employeeId === "NCAT2017" || req.user.firstName === "Chralie")) {
            console.log(`[Students Filter] Adjusting semester from "1" to "3" for NCAT2017 faculty`);
            semesterToSearch = "3";
          }
          
          const semesterDoc = await mongoose.model('Semester').findOne({
            $or: [
              { semesterNumber: parseInt(semesterToSearch) },
              { name: { $regex: semesterToSearch, $options: 'i' } }
            ]
          });
          if (semesterDoc) {
            query.semester = semesterDoc._id;
            console.log(`[Students Filter] Semester filter applied: ${semesterDoc.name || semesterDoc.semesterNumber} (${semesterDoc._id})`);
          } else {
            console.log(`[Students Filter] No semester found for: ${semesterToSearch} (original: ${semester}) - skipping semester filter`);
          }
        } catch (err) {
          console.log("Error finding semester:", err.message);
        }
      }
    }
    
    // Filter by section - direct string match (case insensitive)
    if (section) {
      query.section = { $regex: `^${section}$`, $options: 'i' };
    }
    
    console.log(`[Students Filter] Final query:`, query);
    
    const students = await Student.find(query)
      .populate('stream', 'name code')
      .populate('department', 'name code')
      .populate('semester', 'semesterNumber name')
      .sort({ createdAt: -1 });
    
    console.log(`[Students Filter] Found ${students.length} students`);
    
    res.json({
      success: true,
      data: students,
      message: `Found ${students.length} students`
    });
  } catch (err) {
    console.error('Error in filter route:', err);
    res.status(500).json({ message: 'Error fetching students' });
  }
});

// Alias route for /class - same as filter
router.get('/class', async (req, res) => {
  console.log('[Students Class Route] Redirecting to filter logic with params:', req.query);
  req.url = '/filter';
  return router.handle(req, res);
});

export default router;