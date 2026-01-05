import express from "express";
const router = express.Router();
import Payment from "../models/Payment.js";
import Student from "../models/StudentManagement.js";
import ExtraStudent from "../models/ExtraStudent.js";
import Salary from "../models/Salary.js";

// GET: All receipts with pagination and filtering
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      type,
      status,
      startDate,
      endDate,
      department,
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let allReceipts = [];

    // Fetch student payment receipts
    if (!type || type === "student") {
      let studentPaymentQuery = {};

      // Date range filter
      if (startDate || endDate) {
        studentPaymentQuery.paymentDate = {};
        if (startDate)
          studentPaymentQuery.paymentDate.$gte = new Date(startDate);
        if (endDate) studentPaymentQuery.paymentDate.$lte = new Date(endDate);
      }

      // Status filter
      if (status) studentPaymentQuery.status = status;

      // Search filter
      if (search) {
        const studentQuery = {
          $or: [
            { firstName: { $regex: search, $options: "i" } },
            { lastName: { $regex: search, $options: "i" } },
            { studentId: { $regex: search, $options: "i" } },
          ],
        };
        const matchingStudents = await Student.find(studentQuery).select("_id");
        const matchingExtraStudents = await ExtraStudent.find(studentQuery).select("_id");
        const studentIds = [...matchingStudents.map((s) => s._id), ...matchingExtraStudents.map((s) => s._id)];

        studentPaymentQuery = {
          ...studentPaymentQuery,
          $or: [
            { studentId: { $in: studentIds } },
            { paymentId: { $regex: search, $options: "i" } },
            { receiptNumber: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
            { transactionId: { $regex: search, $options: "i" } },
            { remarks: { $regex: search, $options: "i" } },
          ],
        };
      }

      const studentPayments = await Payment.find(studentPaymentQuery)
        .populate("feeHead", "title")
        .sort({ paymentDate: -1 })
        .lean();

      // Manually populate student data (handle both regular and extra students)
      const paymentsWithStudents = await Promise.all(
        studentPayments.map(async (payment) => {
          let studentData = null;
          
          if (payment.isExtraStudent) {
            // Fetch from ExtraStudent collection
            studentData = await ExtraStudent.findById(payment.studentId)
              .select("firstName lastName studentId department currentSemester")
              .lean();
          } else {
            // Fetch from Student collection
            studentData = await Student.findById(payment.studentId)
              .select("firstName lastName studentId department casteCategory currentSemester")
              .populate("currentSemester", "number")
              .lean();
          }
          
          return {
            ...payment,
            studentData
          };
        })
      );

      // Filter by department if specified
      const filteredStudentPayments = department
        ? paymentsWithStudents.filter((p) => p.studentData?.department === department)
        : paymentsWithStudents;

      // Transform student payments
      const transformedStudentReceipts = filteredStudentPayments.map(
        (payment) => ({
          _id: payment._id,
          type: "student",
          receiptNumber: payment.receiptNumber,
          paymentId:
            payment.paymentId || `SP-${payment._id.toString().slice(-8)}`,
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          paymentDate: payment.paymentDate,
          status: payment.status,
          description:
            payment.description ||
            `Fee payment for ${payment.studentData?.firstName || 'Unknown'} ${payment.studentData?.lastName || 'Student'}`,
          recipientName: `${payment.studentData?.firstName || ""} ${
            payment.studentData?.lastName || ""
          }`.trim() || "Unknown",
          studentId: payment.studentData?.studentId,
          department: payment.studentData?.department,
          casteCategory: payment.studentData?.casteCategory,
          feeHead: payment.feeHead?.title,
          transactionId: payment.transactionId,
          utr: payment.utr || (['Online', 'Bank Transfer', 'Card', 'UPI'].includes(payment.paymentMethod) ? payment.transactionId : ''),
          remarks: payment.remarks,
          collectedBy: payment.collectedBy,
          semester: payment.studentData?.currentSemester?.number || payment.studentData?.currentSemester,
          isExtraStudent: payment.isExtraStudent || false
        })
      );

      allReceipts = [...allReceipts, ...transformedStudentReceipts];
    }

    // Fetch salary payment receipts
    if (!type || type === "salary") {
      let salaryQuery = {};

      if (search) {
        salaryQuery = {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { month: { $regex: search, $options: "i" } },
            { employeeId: { $regex: search, $options: "i" } },
          ],
        };
      }

      if (status) salaryQuery.status = status;

      const salaryPayments = await Salary.find(salaryQuery)
        .sort({ createdAt: -1 })
        .lean();

      // Transform salary payments
      const transformedSalaryReceipts = salaryPayments.map((salary) => ({
        _id: salary._id,
        type: "salary",
        receiptNumber: `SAL-${salary._id.toString().slice(-8)}`,
        paymentId: `SAL-${salary._id.toString().slice(-8)}`,
        amount: salary.amount,
        paymentMethod: "Bank Transfer",
        paymentDate: salary.createdAt || new Date(),
        status: salary.status,
        description: `Salary payment for ${salary.month}`,
        recipientName: salary.name,
        studentId: "",
        department: salary.department || "",
        casteCategory: "",
        feeHead: "",
        transactionId: "",
        remarks: `Monthly salary for ${salary.month}`,
        collectedBy: "System",
        semester: null,
        employeeId: salary.employeeId,
      }));

      allReceipts = [...allReceipts, ...transformedSalaryReceipts];
    }

    // Sort by payment date (newest first)
    allReceipts.sort(
      (a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)
    );

    // Apply pagination
    const paginatedReceipts = allReceipts.slice(skip, skip + limitNum);
    const totalReceipts = allReceipts.length;
    const totalPages = Math.ceil(totalReceipts / limitNum);

    res.json({
      receipts: paginatedReceipts,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalReceipts,
        limit: limitNum,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    });
  } catch (err) {
    console.error("Error fetching receipts:", err);
    res
      .status(500)
      .json({ message: "Error fetching receipts: " + err.message });
  }
});

// GET: Receipt by ID (student payment receipt)
router.get("/student/:id", async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate({
        path: "studentId",
        select: "firstName lastName studentId department casteCategory currentSemester",
        populate: {
          path: "currentSemester",
          select: "number",
        },
      })
      .populate("feeHead", "title");

    if (!payment) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    res.json(payment);
  } catch (err) {
    console.error("Error fetching receipt:", err);
    res.status(500).json({ message: "Error fetching receipt details" });
  }
});

// GET: Receipt by receipt number
router.get("/number/:receiptNumber", async (req, res) => {
  try {
    const payment = await Payment.findOne({
      receiptNumber: req.params.receiptNumber,
    })
      .populate({
        path: "studentId",
        select: "firstName lastName studentId department casteCategory currentSemester",
        populate: {
          path: "currentSemester",
          select: "number",
        },
      })
      .populate("feeHead", "title");

    if (!payment) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    res.json(payment);
  } catch (err) {
    console.error("Error fetching receipt:", err);
    res.status(500).json({ message: "Error fetching receipt by number" });
  }
});

// GET: Salary receipt by ID
router.get("/salary/:id", async (req, res) => {
  try {
    const salary = await Salary.findById(req.params.id);

    if (!salary) {
      return res.status(404).json({ message: "Salary receipt not found" });
    }

    // Transform to receipt format
    const receipt = {
      _id: salary._id,
      type: "salary",
      receiptNumber: `SAL-${salary._id.toString().slice(-8)}`,
      paymentId: `SAL-${salary._id.toString().slice(-8)}`,
      amount: salary.amount,
      paymentMethod: "Bank Transfer",
      paymentDate: salary.createdAt || new Date(),
      status: salary.status,
      description: `Salary payment for ${salary.month}`,
      recipient: {
        name: salary.name,
        employeeId: salary.employeeId,
        department: salary.department,
      },
      remarks: `Monthly salary for ${salary.month}`,
      collectedBy: "System",
    };

    res.json(receipt);
  } catch (err) {
    console.error("Error fetching salary receipt:", err);
    res.status(500).json({ message: "Error fetching salary receipt details" });
  }
});

// GET: Receipt statistics
router.get("/stats", async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Today's receipts
    const todayReceipts = await Payment.countDocuments({
      paymentDate: { $gte: startOfDay },
    });
    const todayAmount = await Payment.aggregate([
      { $match: { paymentDate: { $gte: startOfDay } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    // This month's receipts
    const monthReceipts = await Payment.countDocuments({
      paymentDate: { $gte: startOfMonth },
    });
    const monthAmount = await Payment.aggregate([
      { $match: { paymentDate: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    // This year's receipts
    const yearReceipts = await Payment.countDocuments({
      paymentDate: { $gte: startOfYear },
    });
    const yearAmount = await Payment.aggregate([
      { $match: { paymentDate: { $gte: startOfYear } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    // Receipt status distribution
    const statusDistribution = await Payment.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          amount: { $sum: "$amount" },
        },
      },
    ]);

    // Payment method distribution
    const methodDistribution = await Payment.aggregate([
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 },
          amount: { $sum: "$amount" },
        },
      },
    ]);

    res.json({
      today: {
        count: todayReceipts,
        amount: todayAmount[0]?.total || 0,
      },
      month: {
        count: monthReceipts,
        amount: monthAmount[0]?.total || 0,
      },
      year: {
        count: yearReceipts,
        amount: yearAmount[0]?.total || 0,
      },
      statusDistribution,
      methodDistribution,
    });
  } catch (err) {
    console.error("Error fetching receipt stats:", err);
    res.status(500).json({ message: "Error fetching receipt statistics" });
  }
});

// POST: Generate bulk receipts (for record keeping)
router.post("/bulk-generate", async (req, res) => {
  try {
    const { startDate, endDate, type = "student" } = req.body;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "Start date and end date are required" });
    }

    let query = {
      paymentDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };

    const payments = await Payment.find(query)
      .populate("studentId", "firstName lastName studentId department")
      .populate("feeHead", "title")
      .sort({ paymentDate: -1 });

    // Generate receipt summary
    const receiptSummary = {
      totalReceipts: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      dateRange: { startDate, endDate },
      receipts: payments.map((payment) => ({
        receiptNumber: payment.receiptNumber,
        paymentId: payment.paymentId,
        studentName: `${payment.studentId?.firstName || ""} ${
          payment.studentId?.lastName || ""
        }`.trim(),
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        paymentDate: payment.paymentDate,
        status: payment.status,
      })),
    };

    res.json(receiptSummary);
  } catch (err) {
    console.error("Error generating bulk receipts:", err);
    res.status(500).json({ message: "Error generating bulk receipts" });
  }
});

// PUT: Update student payment receipt
router.put("/student/:id", async (req, res) => {
  try {
    const { amount, status, remarks, lastEditedBy } = req.body;

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    // Update fields
    if (amount !== undefined) payment.amount = amount;
    if (status !== undefined) payment.status = status;
    if (remarks !== undefined) payment.remarks = remarks;
    if (lastEditedBy) payment.lastEditedBy = lastEditedBy;

    payment.updatedAt = new Date();

    await payment.save();

    res.json(payment);
  } catch (err) {
    console.error("Error updating receipt:", err);
    res.status(500).json({ message: "Error updating receipt details" });
  }
});

// PUT: Update salary receipt
router.put("/salary/:id", async (req, res) => {
  try {
    const { amount, status, remarks, lastEditedBy } = req.body;

    const salary = await Salary.findById(req.params.id);
    if (!salary) {
      return res.status(404).json({ message: "Salary receipt not found" });
    }

    // Update fields
    if (amount !== undefined) salary.amount = amount;
    if (status !== undefined) salary.status = status;
    if (remarks !== undefined) salary.remarks = remarks;
    if (lastEditedBy) salary.lastEditedBy = lastEditedBy;

    salary.updatedAt = new Date();

    await salary.save();

    res.json(salary);
  } catch (err) {
    console.error("Error updating salary receipt:", err);
    res.status(500).json({ message: "Error updating salary receipt details" });
  }
});

// DELETE: Delete student payment receipt
router.delete("/student/:id", async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);

    if (!payment) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    res.json({ message: "Receipt deleted successfully" });
  } catch (err) {
    console.error("Error deleting receipt:", err);
    res.status(500).json({ message: "Error deleting receipt" });
  }
});

// DELETE: Delete salary receipt
router.delete("/salary/:id", async (req, res) => {
  try {
    const salary = await Salary.findByIdAndDelete(req.params.id);

    if (!salary) {
      return res.status(404).json({ message: "Salary receipt not found" });
    }

    res.json({ message: "Salary receipt deleted successfully" });
  } catch (err) {
    console.error("Error deleting salary receipt:", err);
    res.status(500).json({ message: "Error deleting salary receipt" });
  }
});

// POST: Export filtered student data for receipts (TEMPORARILY WITHOUT AUTH FOR TESTING)
router.post("/export-filtered", async (req, res) => {
  try {
    const { stream, department, year, admissionFees, examFees } = req.body;

    // Validate required fields
    if (!stream || !department || !year) {
      return res.status(400).json({ 
        message: "Stream, department, and year are required" 
      });
    }

    // Map year to semester numbers
    const yearToSemesterMap = {
      '1st': [1],      // 1st year = 1st semester
      '2nd': [3],      // 2nd year = 3rd semester
      '3rd': [5],      // 3rd year = 5th semester
      '4th': [7]       // 4th year = 7th semester
    };

    const semesterNumbers = yearToSemesterMap[year];
    if (!semesterNumbers) {
      return res.status(400).json({ 
        message: "Invalid year. Must be 1st, 2nd, 3rd, or 4th" 
      });
    }

    // Build student query
    let studentQuery = {
      stream: stream,
      department: department,
      academicStatus: "Active" // Only active students
    };

    // Find semester IDs that match the semester numbers
    const Semester = (await import("../models/Semester.js")).default;
    const matchingSemesters = await Semester.find({ 
      number: { $in: semesterNumbers } 
    }).select('_id');

    if (matchingSemesters.length === 0) {
      return res.status(404).json({ 
        message: "No semesters found for the specified year" 
      });
    }

    const semesterIds = matchingSemesters.map(sem => sem._id);
    studentQuery.semester = { $in: semesterIds };

    // Find students matching the criteria
    const students = await Student.find(studentQuery)
      .populate('department', 'name')
      .populate('stream', 'name')
      .populate('semester', 'number')
      .select('studentId firstName lastName department stream semester feesPaid pendingAmount');

    if (students.length === 0) {
      return res.status(404).json({ 
        message: "No students found matching the specified criteria" 
      });
    }

    const studentIds = students.map(student => student._id);

    // Build payment query
    let paymentQuery = {
      studentId: { $in: studentIds },
      status: 'Completed' // Only completed payments
    };

    // Filter by fee types if specified
    if (admissionFees && examFees) {
      // Both admission and exam fees
      paymentQuery.$or = [
        { admissionType: { $exists: true, $ne: null } },
        { examType: { $exists: true, $ne: null } }
      ];
    } else if (admissionFees) {
      // Only admission fees
      paymentQuery.admissionType = { $exists: true, $ne: null };
    } else if (examFees) {
      // Only exam fees
      paymentQuery.examType = { $exists: true, $ne: null };
    } else {
      // No fee type filter - include all payments
    }

    // Get payments for matching students
    const payments = await Payment.find(paymentQuery)
      .populate('studentId', 'studentId firstName lastName department stream semester')
      .populate('feeHead', 'head amount')
      .sort({ paymentDate: -1 });

    // Group data by department for export
    const exportData = {};

    payments.forEach(payment => {
      const student = payment.studentId;
      if (!student) return;

      const deptName = student.department?.name || 'Unknown Department';
      
      if (!exportData[deptName]) {
        exportData[deptName] = [];
      }

      exportData[deptName].push({
        studentId: student.studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        stream: student.stream?.name || '',
        department: deptName,
        semester: student.semester?.number || '',
        paymentId: payment.paymentId,
        receiptNumber: payment.receiptNumber,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        paymentDate: payment.paymentDate,
        feeHead: payment.feeHead?.head || '',
        description: payment.description || '',
        utr: payment.utr || '',
        admissionType: payment.admissionType || '',
        examType: payment.examType || '',
        collectedBy: payment.collectedBy || ''
      });
    });

    // Convert to array format for frontend processing
    const result = Object.keys(exportData).map(deptName => ({
      department: deptName,
      students: exportData[deptName]
    }));

    res.json({
      success: true,
      data: result,
      totalStudents: students.length,
      totalPayments: payments.length,
      filters: {
        stream,
        department,
        year,
        admissionFees: !!admissionFees,
        examFees: !!examFees
      }
    });

  } catch (error) {
    console.error("Error in export-filtered:", error);
    res.status(500).json({ 
      message: "Error fetching filtered export data", 
      error: error.message 
    });
  }
});

export default router;
