import SalaryRecord from "../models/SalaryRecord.js";
import User from "../models/User.js";
import Faculty from "../models/faculty.js";

const addSalaryRecord = async (req, res) => {
  try {
    const {
      name,
      employeeName,
      employeeId, // Accept employeeId from request
      salaryType,
      basicSalary,
      agp,
      gradePay,
      allowances,
      deductions,
      amount,
      grossSalary,
      totalDeductions,
      netSalary,
      month,
      year,
      status,
      calculatedOn,
      hraRate,
      city,
      paymentDate,
      dailyCalculation
    } = req.body;

    // Use employeeName as fallback for name
    const recordName = name || employeeName;

    if (!recordName) {
      return res.status(400).json({ message: "Employee name is required" });
    }

    // Try to find existing employee by name to get their employeeId
    let finalEmployeeId = employeeId; // Use provided employeeId if available
    
    if (!finalEmployeeId) {
      const existingEmployee = await User.findOne({ 
        $or: [
          { name: recordName },
          { firstName: recordName },
          { $expr: { $eq: [{ $concat: ["$firstName", " ", "$lastName"] }, recordName] } }
        ]
      });
      
      if (existingEmployee && existingEmployee.employeeId) {
        finalEmployeeId = existingEmployee.employeeId;
      } else {
        // Only generate new ID if no existing employee found
        finalEmployeeId = `EMP_${recordName.replace(/\s+/g, '_')}_${Date.now()}`;
      }
    }

    // Extract allowances from nested object
    const da = allowances?.da || 0;
    const hra = allowances?.hra || 0;
    const transportAllowance = allowances?.transportAllowance || 0;
    const claAllowance = allowances?.claAllowance || 0;
    const medicalAllowance = allowances?.medicalAllowance || 0;
    const otherAllowances = allowances?.otherAllowances || 0;

    // Extract deductions from nested object
    const tds = deductions?.tds || 0;
    const epf = deductions?.epf || 0;
    const professionalTax = deductions?.professionalTax || 0;

    // Calculate gross salary if not provided
    const calculatedGrossSalary = grossSalary || amount || (
      (basicSalary || 0) +
      (gradePay || 0) +
      (agp || 0) +
      da + hra + transportAllowance + claAllowance + medicalAllowance + otherAllowances
    );

    // Calculate total deductions if not provided
    const calculatedTotalDeductions = totalDeductions || (tds + epf + professionalTax);

    // Calculate net salary if not provided
    const calculatedNetSalary = netSalary || (calculatedGrossSalary - calculatedTotalDeductions);

    // Try to find existing faculty by employeeId to get their information
    let facultyInfo = null;
    if (finalEmployeeId) {
      facultyInfo = await Faculty.findOne({ employeeId: finalEmployeeId });
    }

    const salaryRecord = new SalaryRecord({
      employeeId: finalEmployeeId, // Use the preserved or found employeeId
      name: recordName,
      department: facultyInfo?.department || 'General', // Use real department from faculty
      designation: facultyInfo?.designation || 'Faculty', // Use real designation from faculty
      type: facultyInfo?.type || 'teaching', // Use real type from faculty
      basicSalary: basicSalary || 0,
      hra: hra,
      da: da,
      bonus: otherAllowances, // Map other allowances to bonus
      grossSalary: calculatedGrossSalary,
      taxDeduction: tds + professionalTax,
      pfDeduction: epf,
      otherDeductions: 0,
      netSalary: calculatedNetSalary,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      status: status === 'Calculated' ? 'Processed' : 'Pending',
      workingHours: dailyCalculation?.workingDays || 0
    });

    await salaryRecord.save();
    
    res.status(201).json({ 
      success: true,
      message: "Salary record created successfully",
      record: salaryRecord
    });
  } catch (error) {
    console.error("Error creating salary record:", error);
    res
      .status(500)
      .json({ 
        success: false,
        message: error.message || "Failed to create salary record" 
      });
  }
};

// Fetch all salary records
const getAllSalaryRecords = async (req, res) => {
  try {
    let query = {};
    
    // If employeeId parameter is provided, filter by employeeId
    if (req.query.employeeId) {
      query.employeeId = req.query.employeeId;
    }
    
    // If name parameter is provided, search by name
    if (req.query.name) {
      query.name = { $regex: req.query.name, $options: 'i' }; // Case-insensitive search
    }
    
    // If month and year parameters are provided, filter by paymentDate
    if (req.query.month && req.query.year) {
      const month = parseInt(req.query.month);
      const year = parseInt(req.query.year);
      
      // Create date range for the specified month and year
      const startDate = new Date(year, month - 1, 1); // month is 0-indexed
      const endDate = new Date(year, month, 0); // Last day of the month
      
      query.paymentDate = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    const records = await SalaryRecord.find(query).sort({ paymentDate: -1 });
    
    // If employeeId is provided, return all records for that employee
    if (req.query.employeeId) {
      return res.status(200).json(records);
    }
    
    // If specific search criteria provided, return success response format expected by frontend
    if (req.query.name || (req.query.month && req.query.year)) {
      if (records.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: "No salary records found for the specified criteria" 
        });
      }
      
      // Transform the record for frontend compatibility
      const record = records[0]; // Take first matching record
      const transformedData = {
        faculty: {
          personalInfo: {
            fullName: record.name,
            employeeId: record.employeeId,
            department: record.department,
            designation: record.designation
          }
        },
        month: req.query.month ? parseInt(req.query.month) : new Date(record.paymentDate).getMonth() + 1,
        year: req.query.year ? parseInt(req.query.year) : new Date(record.paymentDate).getFullYear(),
        basicSalary: record.basicSalary,
        allowances: {
          hra: record.hra,
          da: record.da,
          otherAllowances: record.bonus
        },
        deductions: {
          tds: record.taxDeduction,
          epf: record.pfDeduction,
          otherDeductions: record.otherDeductions
        },
        grossSalary: record.grossSalary,
        totalDeductions: record.taxDeduction + record.pfDeduction + record.otherDeductions,
        netSalary: record.netSalary,
        salaryStatus: record.status,
        salaryType: record.type,
        paymentDate: record.paymentDate,
        paymentId: record._id
      };
      
      return res.status(200).json({ 
        success: true, 
        data: transformedData 
      });
    }
    
    // For general listing, return simple array
    res.status(200).json(records);
  } catch (error) {
    console.error("Error fetching salary records:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch salary records" 
    });
  }
};

// Fetch salary record by employeeId
const getSalaryRecordById = async (req, res) => {
  try {
    const record = await SalaryRecord.findOne({ employeeId: req.params.id });
    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }
    res.status(200).json(record);
  } catch (error) {
    console.error("Error fetching salary record:", error);
    res.status(500).json({ message: "Failed to fetch salary record" });
  }
};

// Update salary record by employeeId
const updateSalaryRecord = async (req, res) => {
  try {
    const {
      name,
      department,
      designation,
      type,
      basicSalary,
      hra,
      da,
      bonus,
      overtimePay,
      taxDeduction,
      pfDeduction,
      otherDeductions,
      workingHours,
      leaveDeduction,
      paymentMethod,
      bankAccount,
      status,
    } = req.body;

    // Find the record by employeeId
    const record = await SalaryRecord.findOne({ employeeId: req.params.id });

    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    // Update fields
    if (name) record.name = name;
    if (department) record.department = department;
    if (designation) record.designation = designation;
    if (type) record.type = type;
    if (basicSalary !== undefined) record.basicSalary = basicSalary;
    if (hra !== undefined) record.hra = hra;
    if (da !== undefined) record.da = da;
    if (bonus !== undefined) record.bonus = bonus;
    if (overtimePay !== undefined) record.overtimePay = overtimePay;
    if (taxDeduction !== undefined) record.taxDeduction = taxDeduction;
    if (pfDeduction !== undefined) record.pfDeduction = pfDeduction;
    if (otherDeductions !== undefined) record.otherDeductions = otherDeductions;
    if (workingHours !== undefined) record.workingHours = workingHours;
    if (leaveDeduction !== undefined) record.leaveDeduction = leaveDeduction;
    if (paymentMethod) record.paymentMethod = paymentMethod;
    if (bankAccount) record.bankAccount = bankAccount;
    if (status) record.status = status;

    // Recalculate gross salary and net salary
    record.grossSalary =
      (record.basicSalary || 0) +
      (record.hra || 0) +
      (record.da || 0) +
      (record.bonus || 0) +
      (record.overtimePay || 0);

    record.netSalary =
      record.grossSalary -
      (record.taxDeduction || 0) -
      (record.pfDeduction || 0) -
      (record.otherDeductions || 0) -
      (record.leaveDeduction || 0);

    // Save updated record
    await record.save();

    res.status(200).json({
      message: "Salary record updated successfully",
      record,
    });
  } catch (error) {
    console.error("Error updating salary record:", error);
    res
      .status(500)
      .json({ message: error.message || "Failed to update salary record" });
  }
};

export {
  addSalaryRecord,
  getAllSalaryRecords,
  getSalaryRecordById,
  updateSalaryRecord,
};
