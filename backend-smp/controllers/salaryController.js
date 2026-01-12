import SalaryRecord from "../models/SalaryRecord.js";
import User from "../models/User.js";
import Faculty from "../models/faculty.js";

const addSalaryRecord = async (req, res) => {
  // Debug: Log incoming payload to help diagnose 500 errors
  console.log('addSalaryRecord payload:', JSON.stringify(req.body));
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
console.log('Parsed addSalaryRecord body:', 
  name,
  employeeName,gradePay)
    // Use employeeName as fallback for name and validate
    const recordName = (name || employeeName || '').trim();

    if (!recordName) {
      return res.status(400).json({ success: false, message: "Employee name is required" });
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

    // Sanitize numeric fields and dates to prevent Mongoose casting issues
    const sanitized = {
      basicSalary: Number(basicSalary) || 0,
      agp: Number(agp) || 0,
      gradePay: Number(gradePay) || 0,
      grossSalary: Number(grossSalary) || Number(amount) || 0,
      tds: Number(deductions?.tds) || 0,
      epf: Number(deductions?.epf) || 0,
      professionalTax: Number(deductions?.professionalTax) || 0,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
    };

    console.log("sanitized salary payload:", { recordName, finalEmployeeId, sanitized });

    // Extract and sanitize allowances from nested object
    const da = Number(allowances?.da) || 0;
    const hra = Number(allowances?.hra) || 0;
    const transportAllowance = Number(allowances?.transportAllowance) || 0;
    const claAllowance = Number(allowances?.claAllowance) || 0;
    const medicalAllowance = Number(allowances?.medicalAllowance) || 0;
    const conveyanceAllowance = Number(allowances?.conveyanceAllowance) || 0;
    const specialAllowance = Number(allowances?.specialAllowance) || 0;
    const otherAllowances = Number(allowances?.otherAllowances) || 0;

    // Extract and sanitize deductions from nested object
    const tds = Number(deductions?.tds) || 0;
    const epf = Number(deductions?.epf) || 0;
    const professionalTax = Number(deductions?.professionalTax) || 0;
    const esiDeduction = Number(deductions?.esi) || 0;
    const advance = Number(deductions?.advance) || 0;
    const loanDeduction = Number(deductions?.loanDeduction) || 0;
    const insuranceDeduction = Number(deductions?.insuranceDeduction) || 0;
    const otherDeductions = Number(deductions?.otherDeductions) || 0;
    const incomeTaxDeduction = Number(deductions?.incomeTax) || 0;

    // Calculate gross salary if not provided
    const calculatedGrossSalary = grossSalary || amount || (
      (basicSalary || 0) +
      (gradePay || 0) +
      (agp || 0) +
      da + hra + transportAllowance + claAllowance + medicalAllowance + conveyanceAllowance + specialAllowance + otherAllowances
    );

    // Calculate total deductions if not provided (include ESI, advance, loan, insurance, income tax and other deductions)
    const calculatedTotalDeductions = totalDeductions || (tds + epf + professionalTax + esiDeduction + advance + loanDeduction + insuranceDeduction + otherDeductions + incomeTaxDeduction);

    // Calculate net salary if not provided
    const calculatedNetSalary = netSalary || (calculatedGrossSalary - calculatedTotalDeductions);

    // Try to find existing faculty by employeeId to get their information
    let facultyInfo = null;
    if (finalEmployeeId) {
      facultyInfo = await Faculty.findOne({ employeeId: finalEmployeeId });
    }

    // Normalize faculty type into allowed enum values for SalaryRecord (teaching | non-teaching)
    let recordType = 'teaching';
    if (facultyInfo && facultyInfo.type) {
      const t = String(facultyInfo.type).toLowerCase();
      if (t === 'teaching' || t === 'non-teaching') {
        recordType = t;
      } else if (t.includes('non') || t.includes('admin') || t.includes('management')) {
        recordType = 'non-teaching';
      } else {
        // Treat HOD/principal/cc and any faculty variations as teaching by default
        recordType = 'teaching';
      }
    }

    const salaryRecord = new SalaryRecord({
      employeeId: finalEmployeeId, // Use the preserved or found employeeId
      name: recordName,
      department: facultyInfo?.department || 'General', // Use real department from faculty
      designation: facultyInfo?.designation || 'Faculty', // Use real designation from faculty
      type: recordType, // Normalized type
      basicSalary: Number(basicSalary) || 0,
      hra: Number(hra) || 0,
      da: Number(da) || 0,
      gradePay: Number(gradePay) || 0,
      transportAllowance: Number(transportAllowance) || 0,
      claAllowance: Number(claAllowance) || 0,
      medicalAllowance: Number(medicalAllowance) || 0,
      conveyanceAllowance: Number(conveyanceAllowance) || 0,
      specialAllowance: Number(specialAllowance) || 0,
      otherAllowances: Number(otherAllowances) || 0,
      bonus: Number(otherAllowances) || 0, // Backwards-compatible mapping
      grossSalary: Number(calculatedGrossSalary) || 0,
      taxDeduction: Number(tds) + Number(professionalTax) + Number(incomeTaxDeduction),
      pfDeduction: Number(epf) || 0,
      esiDeduction: Number(esiDeduction) || 0,
      advance: Number(advance) || 0,
      loanDeduction: Number(loanDeduction) || 0,
      insuranceDeduction: Number(insuranceDeduction) || 0,
      otherDeductions: Number(otherDeductions) || 0,
      netSalary: Number(calculatedNetSalary) || 0,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      status: status === 'Calculated' ? 'Processed' : 'Pending',
      workingHours: dailyCalculation?.workingDays || 0
    });

    console.log('Saving salaryRecord:', {
      employeeId: salaryRecord.employeeId,
      name: salaryRecord.name,
      department: salaryRecord.department,
      designation: salaryRecord.designation,
      type: salaryRecord.type,
      basicSalary: salaryRecord.basicSalary,
      hra: salaryRecord.hra,
      da: salaryRecord.da,
      transportAllowance: salaryRecord.transportAllowance,
      claAllowance: salaryRecord.claAllowance,
      medicalAllowance: salaryRecord.medicalAllowance,
      conveyanceAllowance: salaryRecord.conveyanceAllowance,
      specialAllowance: salaryRecord.specialAllowance,
      otherAllowances: salaryRecord.otherAllowances,
      advance: salaryRecord.advance,
      esiDeduction: salaryRecord.esiDeduction,
      loanDeduction: salaryRecord.loanDeduction,
      insuranceDeduction: salaryRecord.insuranceDeduction,
      grossSalary: salaryRecord.grossSalary
    });

    await salaryRecord.save();
    
    res.status(201).json({ 
      success: true,
      message: "Salary record created successfully",
      record: salaryRecord
    });
  } catch (error) {
    console.error("Error creating salary record:", error);
    // If this is a Mongoose validation error, return a 400 with the details
    if (error && error.name === 'ValidationError') {
      const details = Object.keys(error.errors || {}).map(k => ({ field: k, message: error.errors[k].message }));
      console.error('Validation details:', details);
      return res.status(400).json({ success: false, message: error.message, details });
    }

    // For MongoServerError (duplicate key etc.) return 400 with message
    if (error && error.name === 'MongoServerError') {
      return res.status(400).json({ success: false, message: error.message });
    }

    // Return error stack in non-production for easier debugging
    const resp = { success: false, message: error.message || "Failed to create salary record" };
    if (process.env.NODE_ENV !== 'production' && error.stack) resp.stack = error.stack;
    return res.status(500).json(resp);
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
          transportAllowance: record.transportAllowance || 0,
          claAllowance: record.claAllowance || 0,
          medicalAllowance: record.medicalAllowance || 0,
          conveyanceAllowance: record.conveyanceAllowance || 0,
          specialAllowance: record.specialAllowance || 0,
          otherAllowances: record.otherAllowances || record.bonus || 0,
          gradePay:record.gradePay
        },
        deductions: {
          tds: record.taxDeduction,
          epf: record.pfDeduction,
          esi: record.esiDeduction || 0,
          advance: record.advance || 0,
          loanDeduction: record.loanDeduction || 0,
          insuranceDeduction: record.insuranceDeduction || 0,
          otherDeductions: record.otherDeductions || 0
        },
        grossSalary: record.grossSalary,
        totalDeductions: (record.taxDeduction || 0) + (record.pfDeduction || 0) + (record.esiDeduction || 0) + (record.advance || 0) + (record.loanDeduction || 0) + (record.insuranceDeduction || 0) + (record.otherDeductions || 0),
        netSalary: record.netSalary || (record.grossSalary - ((record.taxDeduction || 0) + (record.pfDeduction || 0) + (record.esiDeduction || 0) + (record.advance || 0) + (record.loanDeduction || 0) + (record.insuranceDeduction || 0) + (record.otherDeductions || 0))),
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
    const id = req.params.id;
    console.log('getSalaryRecordById called with:', id);
    const mongoose = (await import('mongoose')).default;

    let record = null;
    // If id looks like an ObjectId, try findById first (frontend sometimes uses document _id)
    if (mongoose.Types.ObjectId.isValid(id)) {
      record = await SalaryRecord.findById(id);
    }

    // Fallback: try find by employeeId
    if (!record) {
      record = await SalaryRecord.findOne({ employeeId: id });
    }

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

    // Recalculate gross salary and net salary (include all allowance fields)
    record.grossSalary =
      (record.basicSalary || 0) +
      (record.hra || 0) +
      (record.da || 0) +
      (record.transportAllowance || 0) +
      (record.claAllowance || 0) +
      (record.medicalAllowance || 0) +
      (record.conveyanceAllowance || 0) +
      (record.specialAllowance || 0) +
      (record.bonus || 0) +
      (record.overtimePay || 0) +
      (record.otherAllowances || 0);

    record.netSalary =
      record.grossSalary -
      (record.taxDeduction || 0) -
      (record.pfDeduction || 0) -
      (record.esiDeduction || 0) -
      (record.advance || 0) -
      (record.loanDeduction || 0) -
      (record.insuranceDeduction || 0) -
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

// Update salary by document _id
const updateSalaryById = async (req, res) => {
  try {
    const id = req.params.id;
    console.log('updateSalaryById called with id:', id);
    console.log('updateSalaryById payload:', JSON.stringify(req.body, null, 2));

    const mongoose = (await import('mongoose')).default;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.warn('updateSalaryById: invalid ObjectId:', id);
      return res.status(400).json({ message: 'Invalid record ID format' });
    }

    const record = await SalaryRecord.findById(id);
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    const updates = req.body || {};

    // Update basic fields
    if (updates.name || updates.employeeName) {
      record.name = updates.name || updates.employeeName;
    }
    
    if (updates.salaryType) record.salaryType = updates.salaryType;
    if (updates.month !== undefined) record.month = Number(updates.month);
    if (updates.year !== undefined) record.year = Number(updates.year);
    if (updates.basicSalary !== undefined) record.basicSalary = Number(updates.basicSalary) || 0;
    if (updates.agp !== undefined) record.agp = Number(updates.agp) || 0;
    if (updates.gradePay !== undefined) record.gradePay = Number(updates.gradePay) || 0;
    if (updates.grossSalary !== undefined) record.grossSalary = Number(updates.grossSalary) || 0;
    if (updates.totalDeductions !== undefined) record.totalDeductions = Number(updates.totalDeductions) || 0;
    if (updates.netSalary !== undefined) record.netSalary = Number(updates.netSalary) || 0;
    if (updates.status) record.status = updates.status;
    if (updates.paymentDate) record.paymentDate = new Date(updates.paymentDate);
    if (updates.calculatedOn) record.calculatedOn = new Date(updates.calculatedOn);
    if (updates.hraRate) record.hraRate = updates.hraRate;
    if (updates.city) record.city = updates.city;

    // Handle nested allowances object
    if (updates.allowances && typeof updates.allowances === 'object') {
      const allowances = updates.allowances;
      if (allowances.da !== undefined) record.da = Number(allowances.da) || 0;
      if (allowances.hra !== undefined) record.hra = Number(allowances.hra) || 0;
      if (allowances.transportAllowance !== undefined) record.transportAllowance = Number(allowances.transportAllowance) || 0;
      if (allowances.claAllowance !== undefined) record.claAllowance = Number(allowances.claAllowance) || 0;
      if (allowances.medicalAllowance !== undefined) record.medicalAllowance = Number(allowances.medicalAllowance) || 0;
      if (allowances.conveyanceAllowance !== undefined) record.conveyanceAllowance = Number(allowances.conveyanceAllowance) || 0;
      if (allowances.specialAllowance !== undefined) record.specialAllowance = Number(allowances.specialAllowance) || 0;
      if (allowances.otherAllowances !== undefined) record.otherAllowances = Number(allowances.otherAllowances) || 0;
    }

    // Handle nested deductions object
    if (updates.deductions && typeof updates.deductions === 'object') {
      const deductions = updates.deductions;
      const tds = Number(deductions.tds) || 0;
      const pt = Number(deductions.professionalTax) || 0;
      const incomeTax = Number(deductions.incomeTax) || 0;
      record.taxDeduction = tds + pt + incomeTax;
      
      if (deductions.epf !== undefined) record.pfDeduction = Number(deductions.epf) || 0;
      if (deductions.esi !== undefined) record.esiDeduction = Number(deductions.esi) || 0;
      if (deductions.advance !== undefined) record.advance = Number(deductions.advance) || 0;
      if (deductions.loanDeduction !== undefined) record.loanDeduction = Number(deductions.loanDeduction) || 0;
      if (deductions.insuranceDeduction !== undefined) record.insuranceDeduction = Number(deductions.insuranceDeduction) || 0;
      if (deductions.otherDeductions !== undefined) record.otherDeductions = Number(deductions.otherDeductions) || 0;
    }

    // Handle dailyCalculation object
    if (updates.dailyCalculation && typeof updates.dailyCalculation === 'object') {
      const daily = updates.dailyCalculation;
      if (daily.workingDays !== undefined) record.workingDays = Number(daily.workingDays) || 0;
      if (daily.totalMonthDays !== undefined) record.totalMonthDays = Number(daily.totalMonthDays) || 0;
    }

    // Don't recalculate if values were explicitly provided (trust frontend calculation)
    if (updates.grossSalary === undefined) {
      record.grossSalary = (record.basicSalary || 0) + (record.agp || 0) + (record.gradePay || 0) +
                           (record.da || 0) + (record.hra || 0) + 
                           (record.transportAllowance || 0) + (record.claAllowance || 0) + 
                           (record.medicalAllowance || 0) + (record.conveyanceAllowance || 0) + 
                           (record.specialAllowance || 0) + (record.otherAllowances || 0) + 
                           (record.bonus || 0) + (record.overtimePay || 0);
    }

    if (updates.totalDeductions === undefined) {
      record.totalDeductions = (record.taxDeduction || 0) + (record.pfDeduction || 0) + 
                               (record.esiDeduction || 0) + (record.advance || 0) + 
                               (record.loanDeduction || 0) + (record.insuranceDeduction || 0) + 
                               (record.otherDeductions || 0) + (record.leaveDeduction || 0);
    }

    if (updates.netSalary === undefined) {
      record.netSalary = record.grossSalary - record.totalDeductions;
    }

    await record.save();
    console.log('updateSalaryById: record updated successfully');

    res.status(200).json({ 
      success: true,
      message: 'Salary record updated successfully', 
      record 
    });
  } catch (error) {
    console.error('Error updating salary by id:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to update salary record',
      error: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
};

// Delete salary by document _id
const deleteSalaryById = async (req, res) => {
  try {
    const id = req.params.id;
    console.log('deleteSalaryById called with id:', id);

    const mongoose = (await import('mongoose')).default;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.warn('deleteSalaryById: invalid ObjectId:', id);
      return res.status(400).json({ message: 'Invalid record ID format' });
    }

    const record = await SalaryRecord.findByIdAndDelete(id);
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    console.log('deleteSalaryById: record deleted successfully');
    res.status(200).json({ 
      success: true,
      message: 'Record deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting salary record:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to delete salary record' 
    });
  }
};

// Get total salary amount
const getTotalSalary = async (req, res) => {
  try {
    const result = await SalaryRecord.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$netSalary" }
        }
      }
    ]);

    const total = result.length > 0 ? result[0].total : 0;

    res.status(200).json({
      success: true,
      total: total
    });
  } catch (error) {
    console.error("Error calculating total salary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to calculate total salary"
    });
  }
};

export {
  addSalaryRecord,
  getAllSalaryRecords,
  getSalaryRecordById,
  updateSalaryRecord,
  updateSalaryById,
  deleteSalaryById,
  getTotalSalary,
};
