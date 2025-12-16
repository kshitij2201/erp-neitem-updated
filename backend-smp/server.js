import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import bodyParser from "body-parser";
import cron from "node-cron";

// Import Mongoose Models
import Announcement from "./models/Announcement.js";
import Counter from "./models/Counter.js";
import Student from "./models/StudentManagement.js";

// Import Custom Error Handler
import { errorHandler } from "./utils/errorHandler.js";

// Import Auth Middleware
import { protect } from "./middleware/auth.js";

// Import Database Connection
import connectDB from "./config/db.js";

// Import Routes
/*
// These imports are temporarily commented out to avoid conflicts
// They will be re-enabled as needed
import adminAuthRoutes from "./routes/Adminauth.js";
import authRoutes from "./routes/auth.js";
import studentAuthRoutes from "./routes/studentAuth.js";
import superAdminRoutes from "./routes/superAdmin.js";
import casteRoutes from "./routes/caste.js";
import departmentRoutes from "./routes/department.js";
import adminSubjectRoutes from "./routes/Adminsubject.js";
import eventRoutes from "./routes/event.js";
import facultyManagementRoutes from "./routes/faculty.js";
import facultyAuthRoutes from "./routes/facultyAuth.js";
import semesterRoutes from "./routes/semester.js";
import streamRoutes from "./routes/Stream.js";
import studentManagementRoutes from "./routes/StudentManagement.js";
import accountRoutes from "./routes/account.js";
import feeHeaderRoutes from "./routes/feeHeaders.js";
import feePaymentRoutes from "./routes/feepayments.js";
import scholarshipRoutes from "./routes/scholarships.js";
import facultyRoutes from "./routes/facultyRoutes.js";
import salaryRoutes from "./routes/salaryRoutes.js";
import hodRoutes from "./routes/hod.js";
import leaveRoutes from "./routes/leave.js";
import taskRoutes from "./routes/taskRoutes.js";
import attendanceRoutes from "./routes/attendancelogRoutes.js";
import announcementRoutes from "./routes/Announcement.js";
import timetableRoutes from "./routes/timetable.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import studentAttendanceStatsRoutes from "./routes/studentAttendanceStats.js";
import markattendanceRoutes from "./routes/markattendance.js";
import attendanceQueryRoutes from "./routes/attendanceQuery.js";
import filesRoutes from "./routes/files.js";
import ccRoutes from "./routes/ccRoutes.js";
import facultySubjectRoutes from "./routes/facultySubjectRoutes.js";
import populatedDataRoutes from "./routes/populatedData.js";
import feedbackRoutes from "./routes/feedback.js";
// import testFacultySubjectRoutes from "./routes/testFacultySubjectRoutes.js";
import academicCalendarRoutes from "./routes/academicCalendar.js";
import bookRoutes from "./routes/bookRoutes.js";
import issueRoutes from "./routes/issueRoutes.js";
import borrowerEntryRoutes from "./routes/borrowerEntryRoutes.js";
import duesRoutes from "./routes/duesRoutes.js";
import facultyDepartmentSubjectRoutes from "./routes/facultyDepartmentSubjectRoutes.js";
import busRoutes from "./routes/busRoutes.js";
import driverRoutes from "./routes/driverRoutes.js";
import conductorRoutes from "./routes/conductorRoutes.js";
import routeRoutes from "./routes/routeRoutes.js";
import scheduleRoutes from "./routes/scheduleRoutes.js";
import problemRoutes from "./routes/problemRoutes.js";
import accountsRoutes from "./routes/accounts.js";
import auditRoutes from "./routes/audit.js";
import complianceRoutes from "./routes/compliance.js";
import expensesRoutes from "./routes/expenses.js";
import feeHeadsRoutes from "./routes/feeHeadRoutes.js";
import gratuityRoutes from "./routes/gratuity.js";
import incomeTaxRoutes from "./routes/incomeTax.js";
import insuranceRoutes from "./routes/insurance.js";
import integrationRoutes from "./routes/integration.js";
import ledgerRoutes from "./routes/ledger.js";
import maintenanceRoutes from "./routes/maintenance.js";
import notificationsRoutes from "./routes/notifications.js";
// import paymentsRoutes from "./routes/payments.js";
import pfRoutes from "./routes/pf.js";
import purchaseRoutes from "./routes/purchase.js";
import receiptsRoutes from "./routes/receipts.js";
import storeRoutes from "./routes/storeRoutes.js";
import usersRoutes from "./routes/users.js";
*/

// Import only the routes that are actually being used
import authRoutes from "./routes/authRoutes.js";
import superAdminRoutes from "./routes/superAdmin.js";
import studentManagementRoutes from "./routes/StudentManagement.js";
import studentAuthRoutes from "./routes/studentAuth.js";
import facultyManagementRoutes from "./routes/faculty.js";
import streamRoutes from "./routes/Stream.js";
import casteRoutes from "./routes/caste.js";
import departmentRoutes from "./routes/department.js";
import adminSubjectRoutes from "./routes/Adminsubject.js";
import eventRoutes from "./routes/event.js";
import semesterRoutes from "./routes/semester.js";
import facultyAuthRoutes from "./routes/facultyAuth.js";
import accountRoutes from "./routes/account.js";
import accountsRoutes from "./routes/accounts.js";
import feeHeaderRoutes from "./routes/feeHeaders.js";
import feePaymentRoutes from "./routes/feepayments.js";
import scholarshipRoutes from "./routes/scholarships.js";
import facultyRoutes from "./routes/facultyRoutes.js";
import timetableRoutes from "./routes/timetable.js";
import salaryRoutes from "./routes/salaryRoutes.js";
import hodRoutes from "./routes/hod.js";
import leaveRoutes from "./routes/leave.js";
import taskRoutes from "./routes/taskRoutes.js";
import attendanceRoutes from "./routes/attendancelogRoutes.js";
import announcementRoutes from "./routes/Announcement.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import studentsFeeRoutes from "./routes/students.js";
import extraStudentsRoutes from "./routes/extraStudents.js";
import ccRoutes from "./routes/ccRoutes.js";
import markattendanceRoutes from "./routes/markattendance.js";
import attendanceQueryRoutes from "./routes/attendanceQuery.js";
import filesRoutes from "./routes/files.js";
import studentAttendanceStatsRoutes from "./routes/studentAttendanceStats.js";
import feedbackRoutes from "./routes/feedback.js";
import issueRoutes from "./routes/issueRoutes.js";
import busRoutes from "./routes/busRoutes.js";
import driverRoutes from "./routes/driverRoutes.js";
import conductorRoutes from "./routes/conductorRoutes.js";
import routeRoutes from "./routes/routeRoutes.js";
import scheduleRoutes from "./routes/scheduleRoutes.js";
import problemRoutes from "./routes/problemRoutes.js";
import feeHeadsRoutes from "./routes/feeHeadRoutes.js";
import insuranceRoutes from "./routes/insurance.js";
import purchaseRoutes from "./routes/purchase.js";
import maintenanceRoutes from "./routes/maintenance.js";
import paymentsRoutes from "./routes/payments.js";
import expensesRoutes from "./routes/expenses.js";
import receiptsRoutes from "./routes/receipts.js";
import auditRoutes from "./routes/audit.js";
import ledgerRoutes from "./routes/ledger.js";
import incomeTaxRoutes from "./routes/incomeTax.js";
import pfRoutes from "./routes/pf.js";
import gratuityRoutes from "./routes/gratuity.js";
import storeRoutes from "./routes/storeRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";
import subjectRoutes from "./routes/subject.js";
import facultySubjectRoutes from "./routes/facultySubjectRoutes.js";
import facultyDepartmentSubjectRoutes from "./routes/facultyDepartmentSubjectRoutes.js";
import duesRoutes from "./routes/duesRoutes.js";
import academicCalendarRoutes from "./routes/academicCalendar.js";
import analyticsRoutes from "./routes/analytics.js";
import feesRoutes from "./routes/fees.js";
import examFeesRoutes from "./routes/examFees.js";

// Setup __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, ".env") });

// Validate required environment variables
const requiredEnvVars = [
  "MONGO_URI",
  "JWT_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "PORT",
];

const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);
if (missingEnvVars.length > 0) {
  console.error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
  console.error(
    "Please check your .env file and ensure all required variables are set."
  );
  process.exit(1);
}

// Validate JWT_SECRET length for security
if (process.env.JWT_SECRET.length < 32) {
  console.error(
    "JWT_SECRET should be at least 32 characters long for security."
  );
  process.exit(1);
}

// Connect to Database
connectDB();

// Create Express App
const app = express();

// Enhanced CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Define allowed origins
    const allowedOrigins = [
      "https://backenderp.tarstech.in",
      "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:4000",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
      "https://erp.tarstech.in",
    ];

    // Add production URLs if specified
    if (process.env.FRONTEND_URL) {
      allowedOrigins.push(process.env.FRONTEND_URL);
    }
    if (process.env.PRODUCTION_URL) {
      allowedOrigins.push(process.env.PRODUCTION_URL);
    }

    // In development, allow all origins
    if (process.env.NODE_ENV !== "production") {
      return callback(null, true);
    }

    // In production, check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "Cache-Control",
    "X-File-Name",
  ],
  exposedHeaders: ["Content-Range", "X-Content-Range", "Authorization"],
  credentials: true,
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200, // For legacy browser support
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests explicitly
// app.options('*', cors(corsOptions)); // COMMENTED OUT - CAUSES path-to-regexp ERROR

// Security Headers
app.use((req, res, next) => {
  // Remove X-Powered-By header
  res.removeHeader("X-Powered-By");

  // Add security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Content Security Policy (adjust as needed for your app)
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self' https:; " +
        "connect-src 'self' https:; " +
        "media-src 'self'; " +
        "object-src 'none'; " +
        "frame-ancestors 'none';"
    );
  }

  next();
});

// CORS Error Handler
app.use((err, req, res, next) => {
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      error: "CORS Policy Violation",
      message: "This origin is not allowed to access this resource",
      origin: req.headers.origin || "unknown",
    });
  }
  next(err);
});

// Security middleware for rate limiting (in production)
if (process.env.NODE_ENV === "production") {
  const rateLimit = await import("express-rate-limit");
  app.use(
    rateLimit.default({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        error: "Too many requests from this IP, please try again later.",
        retryAfter: "15 minutes",
      },
    })
  );
}

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.method !== "GET" && Object.keys(req.body || {}).length > 0) {
    console.log("Request body keys:", Object.keys(req.body));
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "Uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Ensure uploads directory exists (for student photos)
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Root Route
/*
app.get("/", (req, res) => {
  res.json({
    message: "Hello to College ERP API",
    cors: "enabled",
    timestamp: new Date().toISOString(),
    origin: req.headers.origin || "no-origin"
  });
});

// CORS Test Endpoint
app.get("/api/cors-test", (req, res) => {
  res.json({
    success: true,
    message: "CORS is working correctly!",
    origin: req.headers.origin || "no-origin",
    method: req.method,
    headers: {
      'content-type': req.headers['content-type'],
      'authorization': req.headers['authorization'] ? 'present' : 'not-present',
      'user-agent': req.headers['user-agent']
    },
    timestamp: new Date().toISOString()
  });
});
*/

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/superadmin", superAdminRoutes);
app.use("/api/superadmin/students", studentManagementRoutes);
app.use("/api/superadmin/faculties", facultyManagementRoutes);
app.use("/api/superadmin/streams", streamRoutes);
app.use("/api/superadmin/castes", casteRoutes);
app.use("/api/superadmin/departments", departmentRoutes);
app.use("/api/superadmin/subjects", adminSubjectRoutes);
app.use("/api/superadmin/events", eventRoutes);
app.use("/api/superadmin/semesters", semesterRoutes);
app.use("/api/faculty/auth", facultyAuthRoutes);
app.use("/api/student/auth", studentAuthRoutes);
// Mount public student routes first (without protection for /public endpoint)
app.use("/api/students", studentsFeeRoutes);
app.use("/api/extrastudents", protect, extraStudentsRoutes);
app.use("/api/students/management", protect, studentManagementRoutes);
app.use("/api/accounts", accountsRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/fee-headers", protect, feeHeaderRoutes);
app.use("/api/fee-heads", protect, feeHeadsRoutes);
app.use("/api/insurance", protect, insuranceRoutes);
app.use("/api/fee-payments", protect, feePaymentRoutes);
app.use("/api/scholarships", protect, scholarshipRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/salary", salaryRoutes);
app.use("/api/hod", hodRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/student-attendance", studentAttendanceStatsRoutes);
app.use("/api/faculty/markattendance", markattendanceRoutes);
app.use("/api/faculty/attendance", attendanceQueryRoutes);
app.use("/api/files", filesRoutes);
app.use("/api/cc", ccRoutes);
app.use("/api/faculty-subject", facultySubjectRoutes);
// app.use("/api/populated", populatedDataRoutes);
app.use("/api/feedback", feedbackRoutes);
// app.use("/api/test", testFacultySubjectRoutes);
app.use("/api/academic-calendar", academicCalendarRoutes);

app.use("/api/analytics", analyticsRoutes);
app.use("/api/fees", feesRoutes);
app.use("/api", examFeesRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/faculty-dept-subject", facultyDepartmentSubjectRoutes);
app.use("/api/dues", duesRoutes);
// app.use("/api/borrower-entry", borrowerEntryRoutes);
// app.use("/api/faculty-dept-subject", facultyDepartmentSubjectRoutes);

// // Bus Management Routes
app.use("/api/buses", busRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/conductors", conductorRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/problems", problemRoutes);

// Purchase and Maintenance Routes
app.use("/api/purchases", purchaseRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/payments", protect, paymentsRoutes);
app.use("/api/expenses", protect, expensesRoutes);
app.use("/api/receipts", protect, receiptsRoutes);
app.use("/api/audit", protect, auditRoutes);
app.use("/api/ledger", protect, ledgerRoutes);
app.use("/api/income-tax", incomeTaxRoutes);
app.use("/api/tax", incomeTaxRoutes);
app.use("/api/gratuity", protect, gratuityRoutes);
app.use("/api/pf", protect, pfRoutes);

// Store Management Routes
app.use("/api/store", storeRoutes);

// Cron Job to delete expired announcements
cron.schedule("0 0 * * *", async () => {
  try {
    await Announcement.deleteMany({ endDate: { $lt: new Date() } });
    console.log("Deleted expired announcements");
  } catch (err) {
    console.error("Error deleting expired announcements:", err);
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Global error:", err.stack);

  // Mongoose validation errors
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      error: "Validation Error",
      details: errors,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      error: `Duplicate ${field}. This ${field} already exists.`,
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Something went wrong!",
  });
});

app.use(errorHandler);

// Handle uncaught exceptions and rejections
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err.message);
  process.exit(1);
});
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err.message);
  process.exit(1);
});

// Start Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, (err) => {
  if (err) {
    console.error("Server startup error:", err.message);
    process.exit(1);
  }
  console.log(`Server running on port ${PORT}`);
});
