import express from 'express';
const router = express.Router();
import FeePayment from '../models/feepayment.js';
import Expense from '../models/Expense.js';
import Faculty from '../models/faculty.js';
import Scholarship from '../models/Scholarship.js';

// Debug: indicate this route file was loaded
console.log('[routes/accounts] accounts routes module loaded');

// Mock data for student accounts
let studentAccounts = [
  {
    id: 1,
    studentId: 'STU2024001',
    studentName: 'John Doe',
    academicYear: 2024,
    semester: 1,
    totalAmount: 50000,
    paidAmount: 30000,
    balanceAmount: 20000,
    lateFees: 0,
    dueDate: '2024-08-15',
    status: 'Partial',
    department: 'Computer Science',
    program: 'Bachelor of Technology'
  },
  {
    id: 2,
    studentId: 'STU2024002',
    studentName: 'Jane Smith',
    academicYear: 2024,
    semester: 1,
    totalAmount: 55000,
    paidAmount: 55000,
    balanceAmount: 0,
    lateFees: 0,
    dueDate: '2024-08-15',
    status: 'Paid',
    department: 'Electrical Engineering',
    program: 'Bachelor of Engineering'
  },
  {
    id: 3,
    studentId: 'STU2023001',
    studentName: 'Mike Johnson',
    academicYear: 2024,
    semester: 1,
    totalAmount: 52000,
    paidAmount: 0,
    balanceAmount: 52000,
    lateFees: 2600,
    dueDate: '2024-07-15',
    status: 'Overdue',
    department: 'Mechanical Engineering',
    program: 'Bachelor of Engineering'
  }
];

// GET all student accounts
router.get('/', (req, res) => {
  const { status, department, search, academicYear, semester } = req.query;
  
  let filteredAccounts = [...studentAccounts];
  
  // Filter by status
  if (status) {
    filteredAccounts = filteredAccounts.filter(account => account.status === status);
  }
  
  // Filter by department
  if (department) {
    filteredAccounts = filteredAccounts.filter(account => 
      account.department.toLowerCase().includes(department.toLowerCase())
    );
  }
  
  // Filter by academic year
  if (academicYear) {
    filteredAccounts = filteredAccounts.filter(account => account.academicYear === parseInt(academicYear));
  }
  
  // Filter by semester
  if (semester) {
    filteredAccounts = filteredAccounts.filter(account => account.semester === parseInt(semester));
  }
  
  // Search by student name or ID
  if (search) {
    filteredAccounts = filteredAccounts.filter(account => 
      account.studentName.toLowerCase().includes(search.toLowerCase()) ||
      account.studentId.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  res.json({
    success: true,
    count: filteredAccounts.length,
    data: filteredAccounts
  });
});

// GET account statistics - MUST BE BEFORE /:id route
router.get('/stats/overview', async (req, res) => {
  try {
    console.log('[routes/accounts] GET /stats/overview called');
    
    // Import Payment model for consistency
    const Payment = (await import('../models/Payment.js')).default;
    const Student = (await import('../models/StudentManagement.js')).default;
    
    // Get payment stats from Payment model
    const paymentStats = await Payment.aggregate([
      {
        $match: { status: { $in: ['Completed', 'Paid'] } }
      },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: '$amount' },
          totalPayments: { $sum: 1 }
        }
      }
    ]);
    
    // Get pending fees from Student model
    const studentStats = await Student.aggregate([
      {
        $group: {
          _id: null,
          totalPending: { $sum: { $max: ['$pendingAmount', 0] } },
          totalStudents: { $sum: 1 }
        }
      }
    ]);
    
    // Get expense stats
    const expenseStats = await Expense.aggregate([
      { $match: { status: { $ne: 'Rejected' } } },
      { $group: { _id: null, totalExpenses: { $sum: '$totalAmount' } } }
    ]);
    
    const paymentData = paymentStats[0] || { totalPaid: 0, totalPayments: 0 };
    const studentData = studentStats[0] || { totalPending: 0, totalStudents: 0 };
    const expenseData = expenseStats[0] || { totalExpenses: 0 };
    
    // Calculate total amount (paid + pending)
    const totalAmount = paymentData.totalPaid + studentData.totalPending;
    
    res.json({
      success: true,
      data: {
        totalAccounts: studentData.totalStudents,
        totalAmount: totalAmount,
        totalPaid: paymentData.totalPaid,
        totalBalance: studentData.totalPending,
        totalLateFees: 0, // Could be added later if needed
        totalExpenses: expenseData.totalExpenses,
        collectionRate: totalAmount > 0 ? ((paymentData.totalPaid / totalAmount) * 100).toFixed(2) : 0,
        statusStats: {
          Paid: 0, // Could be calculated from student status
          Partial: 0,
          Pending: 0,
          Overdue: 0
        },
        departmentStats: {} // Could be calculated by department
      }
    });
  } catch (err) {
    console.error('Stats overview fetch error:', err);
    // Fallback response
    res.json({
      success: true,
      data: {
        totalAccounts: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalBalance: 0,
        totalLateFees: 0,
        totalExpenses: 0,
        collectionRate: 0,
        statusStats: {
          Paid: 0,
          Partial: 0,
          Pending: 0,
          Overdue: 0
        },
        departmentStats: {}
      }
    });
  }
});

// GET financial summary for dashboard
router.get('/financial-summary', async (req, res) => {
  try {
    console.log('[routes/accounts] GET /financial-summary called');
    
    // Import Payment model
    const Payment = (await import('../models/Payment.js')).default;
    
    // Get payment stats from Payment model (not FeePayment)
    const paymentStats = await Payment.aggregate([
      {
        $match: { status: { $in: ['Completed', 'Paid'] } } // Only count completed payments
      },
      {
        $group: {
          _id: null,
          totalFeesCollected: { $sum: '$amount' },
          totalPayments: { $sum: 1 }
        }
      }
    ]);
    
    // Get pending fees from Student model
    const Student = (await import('../models/StudentManagement.js')).default;
    const studentStats = await Student.aggregate([
      {
        $group: {
          _id: null,
          totalPendingFees: { $sum: { $max: ['$pendingAmount', 0] } }
        }
      }
    ]);
    
    // Get expense stats
    const expenseStats = await Expense.aggregate([
      { $match: { status: { $ne: 'Rejected' } } },
      { $group: { _id: null, totalExpenses: { $sum: '$totalAmount' } } }
    ]);
    
    // Get faculty salary stats (placeholder - would need faculty salary data)
    // For now, using a fixed value or calculating from faculty model if available
    const facultySalaryStats = await Faculty.aggregate([
      { $group: { _id: null, facultySalaries: { $sum: '$salary' } } }
    ]);

    // Calculate total applied fee heads across all students
    const FeeHead = (await import('../models/FeeHead.js')).default;
    
    const students = await Student.find({}).populate('stream');
    let totalAppliedFeeHeads = 0;
    
    for (const student of students) {
      try {
        // Get all fee heads
        const allHeads = await FeeHead.find();
        
        // Filter applicable fee heads for this student
        const applicableHeads = allHeads.filter((head) => {
          if (head.applyTo === "all") return true;

          const matchStream = head.filters?.stream
            ? String(head.filters.stream) === String(student.stream?._id)
            : true;

          // Map remote caste categories to our fee head filters
          let studentCaste = student.casteCategory || "Open";
          
          // Normalize caste category mapping
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

        // Add semester filtering if applicable
        const semesterFilteredHeads = applicableHeads.filter((head) => {
          if (head.semester && student.currentSemester) {
            return head.semester === student.currentSemester;
          }
          return true; // If no semester specified, apply to all
        });

        // Sum the amounts
        const studentTotal = semesterFilteredHeads.reduce((sum, h) => sum + h.amount, 0);
        totalAppliedFeeHeads += studentTotal;
      } catch (error) {
        console.error(`Error calculating fee heads for student ${student._id}:`, error);
        // Continue with next student
      }
    }
    
    const paymentData = paymentStats[0] || { totalFeesCollected: 0, totalPayments: 0 };
    const pendingData = studentStats[0] || { totalPendingFees: 0 };
    const expenseData = expenseStats[0] || { totalExpenses: 0 };
    const salaryData = facultySalaryStats[0] || { facultySalaries: 0 };
    
    // Calculate derived values
    const totalRevenue = paymentData.totalFeesCollected; // Revenue from fees
    const netBalanceStudentFees = paymentData.totalFeesCollected - pendingData.totalPendingFees;
    const pendingCollection = pendingData.totalPendingFees;
    
    res.json({
      totalFeesCollected: paymentData.totalFeesCollected,
      pendingFees: pendingData.totalPendingFees,
      totalAppliedFeeHeads: totalAppliedFeeHeads,
      totalExpenses: expenseData.totalExpenses,
      totalRevenue: paymentData.totalFeesCollected,
      netBalanceStudentFees: paymentData.totalFeesCollected - pendingData.totalPendingFees,
      pendingCollection: pendingData.totalPendingFees,
      facultySalaries: salaryData.facultySalaries
    });
  } catch (err) {
    console.error('Financial summary fetch error:', err);
    // Fallback to zero values
    res.json({
      totalFeesCollected: 0,
      pendingFees: 0,
      totalAppliedFeeHeads: 0,
      totalExpenses: 0,
      totalRevenue: 0,
      netBalanceStudentFees: 0,
      pendingCollection: 0,
      facultySalaries: 0
    });
  }
});

// GET account by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const account = studentAccounts.find(a => a.id === parseInt(id) || a.studentId === id);
  
  if (!account) {
    return res.status(404).json({
      success: false,
      error: 'Account not found'
    });
  }
  
  res.json({
    success: true,
    data: account
  });
});

// GET account by student ID
router.get('/student/:studentId', (req, res) => {
  const { studentId } = req.params;
  const accounts = studentAccounts.filter(a => a.studentId === studentId);
  
  res.json({
    success: true,
    count: accounts.length,
    data: accounts
  });
});

// POST create new account
router.post('/', (req, res) => {
  const {
    studentId,
    studentName,
    academicYear,
    semester,
    totalAmount,
    dueDate,
    department,
    program
  } = req.body;
  
  // Validation
  if (!studentId || !studentName || !academicYear || !semester || !totalAmount || !dueDate) {
    return res.status(400).json({
      success: false,
      error: 'Required fields missing'
    });
  }
  
  // Check if account already exists for this student, year, and semester
  const existingAccount = studentAccounts.find(a => 
    a.studentId === studentId && 
    a.academicYear === academicYear && 
    a.semester === semester
  );
  
  if (existingAccount) {
    return res.status(400).json({
      success: false,
      error: 'Account already exists for this student, year, and semester'
    });
  }
  
  const newAccount = {
    id: studentAccounts.length + 1,
    studentId,
    studentName,
    academicYear,
    semester,
    totalAmount,
    paidAmount: 0,
    balanceAmount: totalAmount,
    lateFees: 0,
    dueDate,
    status: 'Pending',
    department,
    program,
    createdAt: new Date().toISOString()
  };
  
  studentAccounts.push(newAccount);
  
  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: newAccount
  });
});

// PUT update account
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const accountIndex = studentAccounts.findIndex(a => a.id === parseInt(id) || a.studentId === id);
  
  if (accountIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Account not found'
    });
  }
  
  const updatedAccount = {
    ...studentAccounts[accountIndex],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  
  // Recalculate balance
  updatedAccount.balanceAmount = updatedAccount.totalAmount - updatedAccount.paidAmount + updatedAccount.lateFees;
  
  // Update status based on balance
  if (updatedAccount.balanceAmount <= 0) {
    updatedAccount.status = 'Paid';
  } else if (updatedAccount.paidAmount > 0) {
    updatedAccount.status = 'Partial';
  } else if (new Date() > new Date(updatedAccount.dueDate)) {
    updatedAccount.status = 'Overdue';
  } else {
    updatedAccount.status = 'Pending';
  }
  
  studentAccounts[accountIndex] = updatedAccount;
  
  res.json({
    success: true,
    message: 'Account updated successfully',
    data: updatedAccount
  });
});

// POST record payment
router.post('/:id/payment', (req, res) => {
  const { id } = req.params;
  const { amount, paymentMethod, remarks } = req.body;
  
  const accountIndex = studentAccounts.findIndex(a => a.id === parseInt(id) || a.studentId === id);
  
  if (accountIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Account not found'
    });
  }
  
  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid payment amount'
    });
  }
  
  const account = studentAccounts[accountIndex];
  const newPaidAmount = account.paidAmount + amount;
  const newBalance = account.totalAmount - newPaidAmount + account.lateFees;
  
  // Update account
  account.paidAmount = newPaidAmount;
  account.balanceAmount = newBalance;
  
  // Update status
  if (newBalance <= 0) {
    account.status = 'Paid';
  } else if (newPaidAmount > 0) {
    account.status = 'Partial';
  }
  
  account.updatedAt = new Date().toISOString();
  
  // Add payment record
  const payment = {
    id: Date.now(),
    accountId: account.id,
    amount,
    paymentMethod,
    remarks,
    paymentDate: new Date().toISOString()
  };
  
  res.json({
    success: true,
    message: 'Payment recorded successfully',
    data: {
      account,
      payment
    }
  });
});

// Revenue breakdown endpoint
router.get('/revenue/breakdown', async (req, res) => {
  try {
    // Get fee payments breakdown by category/type
    const feeRevenue = await FeePayment.aggregate([
      {
        $lookup: {
          from: 'feeheaders',
          localField: 'feeHeader',
          foreignField: '_id',
          as: 'feeHeaderInfo'
        }
      },
      {
        $unwind: { path: '$feeHeaderInfo', preserveNullAndEmptyArrays: true }
      },
      {
        $group: {
          _id: '$feeHeaderInfo.feeType',
          total: { $sum: '$amountPaid' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);

    // Get other revenue sources (scholarships, etc.)
    const scholarshipRevenue = await Scholarship.aggregate([
      {
        $group: {
          _id: 'Scholarships',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const breakdown = {
      feeRevenue: feeRevenue.map(item => ({
        category: item._id || 'Other Fees',
        amount: item.total,
        transactions: item.count
      })),
      otherRevenue: scholarshipRevenue.length > 0 ? [{
        category: 'Scholarships',
        amount: scholarshipRevenue[0].total,
        transactions: scholarshipRevenue[0].count
      }] : [],
      totalRevenue: feeRevenue.reduce((sum, item) => sum + item.total, 0) + 
                   (scholarshipRevenue[0]?.total || 0)
    };

    res.json(breakdown);
  } catch (error) {
    console.error('Revenue breakdown error:', error);
    res.status(500).json({ error: 'Failed to fetch revenue breakdown' });
  }
});

// Temporary route to add sample data for testing
router.post('/seed-sample-data', async (req, res) => {
  try {
    // Add sample fee payments
    const sampleFeePayments = [
      { student: '507f1f77bcf86cd799439011', semester: '507f1f77bcf86cd799439012', feeHeader: '507f1f77bcf86cd799439013', amountPaid: 25000, pendingAmount: 5000 },
      { student: '507f1f77bcf86cd799439014', semester: '507f1f77bcf86cd799439015', feeHeader: '507f1f77bcf86cd799439016', amountPaid: 30000, pendingAmount: 0 },
      { student: '507f1f77bcf86cd799439017', semester: '507f1f77bcf86cd799439018', feeHeader: '507f1f77bcf86cd799439019', amountPaid: 15000, pendingAmount: 15000 },
    ];

    await FeePayment.insertMany(sampleFeePayments);

    // Add sample expenses
    const sampleExpenses = [
      { title: 'Office Supplies', amount: 5000, category: 'Office Supplies', status: 'Approved', expenseDate: new Date() },
      { title: 'Internet Bill', amount: 3000, category: 'Utilities', status: 'Approved', expenseDate: new Date() },
      { title: 'Computer Maintenance', amount: 8000, category: 'Maintenance', status: 'Approved', expenseDate: new Date() },
      { title: 'Software License', amount: 15000, category: 'Software', status: 'Approved', expenseDate: new Date() },
    ];

    await Expense.insertMany(sampleExpenses);

    res.json({ message: 'Sample data added successfully' });
  } catch (err) {
    console.error('Error adding sample data:', err);
    res.status(500).json({ error: 'Failed to add sample data' });
  }
});

export default router;