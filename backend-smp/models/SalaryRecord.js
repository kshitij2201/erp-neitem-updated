import mongoose from "mongoose";

const salaryRecordSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true },
    name: { type: String, required: true },
    department: { type: String, required: false, default: 'General' },
    designation: { type: String, required: false, default: 'Faculty' },
    type: { type: String, enum: ["teaching", "non-teaching"], required: false, default: "teaching" },
    salaryType: { type: String }, // e.g., "6th Pay Commission", "Actual Salary"
    month: { type: Number }, // Salary month (1-12)
    year: { type: Number }, // Salary year
    basicSalary: { type: Number, required: true, default: 0 },
    agp: { type: Number, default: 0 }, // Academic Grade Pay
    gradePay: { type: Number, default: 0 }, // Grade Pay for non-teaching
    hra: { type: Number, default: 0 },
    da: { type: Number, default: 0 },
    transportAllowance: { type: Number, default: 0 },
    claAllowance: { type: Number, default: 0 },
    medicalAllowance: { type: Number, default: 0 },
    conveyanceAllowance: { type: Number, default: 0 },
    specialAllowance: { type: Number, default: 0 },
    otherAllowances: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    overtimePay: { type: Number, default: 0 },
    grossSalary: { type: Number, required: true, default: 0 },
    taxDeduction: { type: Number, default: 0 },
    pfDeduction: { type: Number, default: 0 },
    esiDeduction: { type: Number, default: 0 },
    advance: { type: Number, default: 0 },
    loanDeduction: { type: Number, default: 0 },
    insuranceDeduction: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    netSalary: { type: Number, required: true, default: 0 },
    paymentDate: { type: Date, required: true, default: Date.now },
    paymentMethod: {
      type: String,
      enum: ["Bank Transfer", "Cash", "Cheque"],
      default: "Bank Transfer",
    },
    bankAccount: { type: String },
    workingHours: { type: Number, default: 0 },
    workingDays: { type: Number, default: 0 },
    totalMonthDays: { type: Number, default: 0 },
    leaveDeduction: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Pending", "Processed", "Calculated", "Paid"],
      default: "Pending",
    },
    calculatedOn: { type: Date },
    hraRate: { type: String },
    city: { type: String },
  },
  { timestamps: true, strict: false }
);

export default mongoose.model("SalaryRecord", salaryRecordSchema);
