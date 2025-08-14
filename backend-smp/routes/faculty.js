import express from "express";
import Faculty from "../models/faculty.js";
import Salary from "../models/Salary.js";
import PF from "../models/PF.js";
import IncomeTax from "../models/IncomeTax.js";
import HODHistory from "../models/HODHistory.js";
import PrincipalHistory from "../models/PrincipalHistory.js";
import bcrypt from "bcrypt";
import { roleLogin } from "../controllers/facultyController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Role-based login for faculty
router.post("/rolelogin", roleLogin);

// Create faculty
router.post("/", async (req, res) => {
  try {
    const { firstname, type, employmentStatus, employeeId, password, department } = req.body;

    // Check if employee ID already exists
    const existingFaculty = await Faculty.findOne({ employeeId });
    if (existingFaculty) {
      return res.status(400).json({ error: "Employee ID already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    const faculty = new Faculty({
      firstname,
      type,
      employmentStatus,
      employeeId,
      password: hashedPassword,
      department,
    });

    await faculty.save();
    res.status(201).json(faculty);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all faculty with optional type filter
router.get("/", async (req, res) => {
  try {
    const { type } = req.query;
    let query = {};

    // If type is provided, filter by type
    if (type) {
      query.type = type;
    }

    const faculties = await Faculty.find(query).populate("department", "name");
    res.json(faculties);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all faculties (for dashboard)
router.get("/all", async (req, res) => {
  try {
    const faculties = await Faculty.find({}).populate("department", "name");
    
    // Create department-wise breakdown
    const departmentWise = {};
    faculties.forEach(faculty => {
      const deptName = faculty.department?.name || faculty.department || "Unknown";
      if (!departmentWise[deptName]) {
        departmentWise[deptName] = 0;
      }
      departmentWise[deptName]++;
    });

    const departmentWiseArray = Object.entries(departmentWise).map(([name, count]) => ({
      name,
      count
    }));

    res.json({ 
      faculties, 
      total: faculties.length,
      departmentWise: departmentWiseArray
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search faculty by employeeId or name (This must come BEFORE /:id route)
router.get("/search/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params;
    
    console.log('=== FACULTY SEARCH REQUEST ===');
    console.log('Searching for faculty with identifier:', identifier);
    
    // Test response first
    return res.json({ 
      message: "Search endpoint working", 
      identifier: identifier,
      timestamp: new Date().toISOString() 
    });
    
    // Rest of the code commented out temporarily for debugging
    /*
    // First try to find by employeeId
    let faculty = await Faculty.findOne({ employeeId: identifier });
    
    // If not found, try to search by name variations
    if (!faculty) {
      faculty = await Faculty.findOne({
        $or: [
          { firstName: { $regex: identifier, $options: 'i' } },
          { lastName: { $regex: identifier, $options: 'i' } },
          { $expr: { 
            $regexMatch: { 
              input: { $concat: ['$firstName', ' ', '$lastName'] }, 
              regex: identifier, 
              options: 'i' 
            }
          }}
        ]
      });
    }
    
    // If still not found, check User model (Faculties collection)
    if (!faculty) {
      const User = await import('../models/User.js');
      const UserModel = User.default;
      
      faculty = await UserModel.findOne({
        $or: [
          { employeeId: identifier },
          { name: { $regex: identifier, $options: 'i' } },
          { $expr: { 
            $regexMatch: { 
              input: { $concat: ['$firstName', ' ', '$lastName'] }, 
              regex: identifier, 
              options: 'i' 
            }
          }}
        ]
      });
    }
    
    if (!faculty) {
      console.log('Faculty not found for identifier:', identifier);
      return res.status(404).json({ error: "Faculty not found" });
    }
    
    console.log('Found faculty:', faculty.name || faculty.firstName);
    res.json(faculty);
    */
  } catch (err) {
    console.error('Error in faculty search:', err);
    res.status(400).json({ error: err.message });
  }
});

// Get single faculty by ID
router.get("/:id", async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }
    res.json(faculty);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update employment status
router.put("/:id", async (req, res) => {
  try {
    const updates = req.body;
    const faculty = await Faculty.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }
    res.json(faculty);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update employment status by employee ID
router.put("/employment-status/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { employmentStatus } = req.body;
    
    // Validate employment status
    if (!["Probation Period", "Permanent Employee"].includes(employmentStatus)) {
      return res.status(400).json({ 
        error: "Invalid employment status. Must be 'Probation Period' or 'Permanent Employee'" 
      });
    }

    const faculty = await Faculty.findOneAndUpdate(
      { employeeId }, 
      { employmentStatus }, 
      { new: true }
    );
    
    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }
    
    res.json({ 
      message: "Employment status updated successfully", 
      faculty: {
        employeeId: faculty.employeeId,
        firstname: faculty.firstname,
        employmentStatus: faculty.employmentStatus
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete faculty
router.delete("/:id", async (req, res) => {
  try {
    const faculty = await Faculty.findByIdAndDelete(req.params.id);
    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }
    res.json({ message: "Faculty deleted successfully." });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Faculty Dashboard Status API
router.get("/dashboard/status", protect, async (req, res) => {
  try {
    const { financialYear = '2024-2025' } = req.query;

    // Get all faculty data
    const faculties = await Faculty.find({}).populate("department", "name");
    
    // Get salary data for all faculty
    const salaryData = await Salary.aggregate([
      {
        $group: {
          _id: "$employeeName",
          totalSalary: { $sum: "$netSalary" },
          recordCount: { $sum: 1 }
        }
      }
    ]);

    // Get PF data
    const pfData = await PF.find({ financialYear });
    
    // Get Income Tax data
    const incomeTaxData = await IncomeTax.find({ financialYear });

    // Calculate totals
    const totalPaid = salaryData.reduce((sum, emp) => sum + (emp.totalSalary || 0), 0);
    const totalEmployees = faculties.length;
    
    // Calculate PF totals
    const totalEmployeePF = pfData.reduce((sum, pf) => sum + (pf.employeePFContribution || 0), 0);
    const totalEmployerPF = pfData.reduce((sum, pf) => sum + (pf.employerPFContribution || 0), 0);
    
    // Calculate Income Tax totals
    const totalTaxLiability = incomeTaxData.reduce((sum, tax) => sum + (tax.totalTax || 0), 0);
    
    // Calculate compliance
    const employeesWithPF = pfData.length;
    const employeesWithIncomeTax = incomeTaxData.length;
    
    const statusData = {
      totalPaid,
      pf: {
        totalEmployeePF,
        totalEmployerPF,
        records: pfData.length
      },
      incomeTax: {
        totalLiability: totalTaxLiability,
        records: incomeTaxData.length
      },
      compliance: {
        totalEmployees,
        pfCompliant: employeesWithPF
      }
    };

    res.json(statusData);
  } catch (err) {
    console.error('Faculty dashboard status error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Faculty Dashboard Data API
router.get("/dashboard/data", protect, async (req, res) => {
  try {
    const { financialYear = '2024-2025' } = req.query;

    // Get all faculty data
    const faculties = await Faculty.find({}).populate("department", "name");
    
    // Get salary data grouped by employee
    const salaryData = await Salary.aggregate([
      {
        $group: {
          _id: "$employeeName",
          totalSalary: { $sum: "$netSalary" },
          recordCount: { $sum: 1 }
        }
      }
    ]);

    // Get PF data
    const pfData = await PF.find({ financialYear });
    const pfByEmployee = {};
    pfData.forEach(pf => {
      pfByEmployee[pf.employeeName] = pf;
    });
    
    // Get Income Tax data
    const incomeTaxData = await IncomeTax.find({ financialYear });
    const incomeTaxByEmployee = {};
    incomeTaxData.forEach(tax => {
      incomeTaxByEmployee[tax.employeeName] = tax;
    });

    // Create salary lookup
    const salaryByEmployee = {};
    salaryData.forEach(salary => {
      salaryByEmployee[salary._id] = salary;
    });

    // Combine faculty data with salary, PF, and income tax info
    const facultyData = faculties.map(faculty => {
      const empName = faculty.firstname;
      const salary = salaryByEmployee[empName];
      const pf = pfByEmployee[empName];
      const incomeTax = incomeTaxByEmployee[empName];
      
      return {
        name: empName,
        totalSalary: salary?.totalSalary || 0,
        recordCount: salary?.recordCount || 0,
        pf: pf ? {
          pfNumber: pf.pfNumber,
          totalPFContribution: (pf.employeePFContribution || 0) + (pf.employerPFContribution || 0),
          employeePFContribution: pf.employeePFContribution || 0,
          employerPFContribution: pf.employerPFContribution || 0,
          professionalTax: pf.professionalTax || 0
        } : null,
        incomeTax: incomeTax ? {
          panNumber: incomeTax.panNumber,
          financialYear: incomeTax.financialYear,
          grossIncome: incomeTax.grossIncome || 0,
          totalTax: incomeTax.totalTax || 0,
          tdsDeducted: incomeTax.tdsDeducted || 0
        } : null,
        hasCompleteData: !!(salary && pf && incomeTax)
      };
    });

    // Calculate summary statistics
    const totalEmployees = faculties.length;
    const totalSalaryPaid = facultyData.reduce((sum, emp) => sum + emp.totalSalary, 0);
    const employeesWithPF = facultyData.filter(emp => emp.pf).length;
    const employeesWithIncomeTax = facultyData.filter(emp => emp.incomeTax).length;
    const fullyCompliantEmployees = facultyData.filter(emp => emp.hasCompleteData).length;

    const dashboardData = {
      summary: {
        totalEmployees,
        totalSalaryPaid,
        employeesWithPF,
        employeesWithIncomeTax,
        fullyCompliantEmployees,
        pendingPayments: 0,
        complianceRate: totalEmployees > 0 ? Math.round((fullyCompliantEmployees / totalEmployees) * 100) : 0
      },
      facultyData
    };

    res.json(dashboardData);
  } catch (err) {
    console.error('Faculty dashboard data error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get HOD history
router.get("/hod-history", async (req, res) => {
  try {
    console.log("Fetching HOD history...");
    const hodHistory = await HODHistory.find()
      .populate('facultyId', 'firstName lastName employeeId')
      .sort({ startDate: -1 });
    
    console.log(`Found ${hodHistory.length} HOD history records`);
    res.json(hodHistory);
  } catch (err) {
    console.error('Error fetching HOD history:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get Principal history
router.get("/principal-history", async (req, res) => {
  try {
    console.log("Fetching Principal history...");
    const principalHistory = await PrincipalHistory.find()
      .populate('facultyId', 'firstName lastName employeeId')
      .sort({ startDate: -1 });
    
    console.log(`Found ${principalHistory.length} Principal history records`);
    res.json(principalHistory);
  } catch (err) {
    console.error('Error fetching Principal history:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;