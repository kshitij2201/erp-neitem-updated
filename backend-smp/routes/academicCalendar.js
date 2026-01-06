import express from "express";
import {
  createAcademicYear,
  createSemester,
  createSubjectSchedule,
  getFacultyCalendar,
  updateLectureProgress,
  getDepartmentCalendar,
  logLecture,
  getActiveAcademicYear,
} from "../controllers/academicCalendarNewController.js";
import {
  getAcademicCalendars,
  createAcademicCalendar,
  getAcademicCalendarById,
  updateAcademicCalendar,
  deleteAcademicCalendar,
  publishAcademicCalendar,
  addTopicToCalendar,
  updateTopicInCalendar,
  deleteTopicFromCalendar,
  getFacultyBySubject,
  getSubjectsByDepartment,
  getFacultyByDepartment,
} from "../controllers/academicCalendarController.js";
import { protect } from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";

const router = express.Router();

// Helper to read metadata for a given uploaded file (if present)
const readMetaForFile = (filename) => {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const metaPath = path.join(uploadsDir, `${filename}.meta.json`);
    if (fs.existsSync(metaPath)) {
      const raw = fs.readFileSync(metaPath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('readMetaForFile error for', filename, err);
  }
  return null;
};

// Helper to decide whether a user can access (view) a file
const canAccessFile = (user, meta) => {
  if (!user) return false;
  const userId = user._id ? String(user._id) : String(user.id || '');
  const userRole = (user.role || '').toString().toLowerCase();
  let userDepartment = null;
  if (user.department) userDepartment = user.department._id ? String(user.department._id) : String(user.department);

  // Owner always has access
  if (meta && meta.uploaderId && String(meta.uploaderId) === userId) return true;

  // HOD can view uploads from their department
  if (userRole === 'hod' && meta && meta.uploaderDepartment && userDepartment && String(meta.uploaderDepartment) === String(userDepartment)) return true;

  // Otherwise deny
  return false;
};

// Helper to decide whether a user can modify (edit/rename/delete) a file
const canModifyFile = (user, meta) => {
  if (!user) return false;
  const userId = user._id ? String(user._id) : String(user.id || '');
  // Only the original uploader may modify their file
  if (meta && meta.uploaderId && String(meta.uploaderId) === userId) return true;
  return false;
};

// Academic Calendar CRUD operations (for frontend)
router.get("/", protect, getAcademicCalendars);
router.post("/", protect, createAcademicCalendar);

// Robust Upload handler (placed early to take precedence)
router.post("/upload", protect, upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      const message = req.fileValidationError || "No file uploaded";
      return res.status(400).json({ success: false, message });
    }

    // Capture uploader info from authenticated user
    const uploaderId = req.user && (req.user._id || req.user.id) ? String(req.user._id || req.user.id) : null;
    const uploaderName = req.user && (req.user.firstName || req.user.name) ? (req.user.firstName || req.user.name) : null;
    const uploaderRole = req.user && req.user.role ? req.user.role : null;
    let uploaderDepartment = null;
    if (req.user && req.user.department) {
      uploaderDepartment = req.user.department._id ? String(req.user.department._id) : String(req.user.department);
    }

    const fileRecord = {
      originalName: req.file.originalname,
      name: req.file.filename,
      url: `/uploads/${encodeURIComponent(req.file.filename)}`,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
      meta: {
        uploaderId,
        uploaderName,
        uploaderRole,
        uploaderDepartment,
        uploaderOriginalName: req.file.originalname,
      },
    };

    // Persist simple per-file metadata alongside the file to support permission checks
    try {
      const uploadsDir = path.join(process.cwd(), "uploads");
      const metaPath = path.join(uploadsDir, `${req.file.filename}.meta.json`);
      fs.writeFileSync(metaPath, JSON.stringify(fileRecord.meta));
    } catch (metaErr) {
      console.warn('Failed to write metadata file for upload', metaErr);
    }

    return res.json({ success: true, file: fileRecord });
  } catch (err) {
    console.error("Upload handler error:", err);
    return res.status(500).json({ success: false, message: "Upload failed" });
  }
});

// Uploads: list and POST an uploaded teaching plan file
// Placed before the ":id" route to avoid being captured as an id value.
// GET /api/academic-calendar/uploads -> returns list of uploaded files (public metadata)
router.get("/uploads", protect, async (req, res) => {
  try {
    const uploadsDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) {
      return res.json({ success: true, data: [] });
    }

    const allFiles = fs.readdirSync(uploadsDir).filter((f) => !f.endsWith('.meta.json'));
    const files = [];

    for (const fname of allFiles) {
      const fullPath = path.join(uploadsDir, fname);
      const stats = fs.statSync(fullPath);
      const meta = readMetaForFile(fname);

      // Skip files the user is not allowed to see
      if (!canAccessFile(req.user, meta)) continue;

      files.push({
        name: fname,
        originalName: (meta && meta.uploaderOriginalName) ? meta.uploaderOriginalName : fname,
        url: `/uploads/${encodeURIComponent(fname)}`,
        size: stats.size,
        uploadedAt: stats.mtime,
        meta,
      });
    }

    return res.json({ success: true, data: files });
  } catch (err) {
    console.error("Error listing uploaded plans:", err);
    return res.status(500).json({ success: false, message: "Failed to list uploads" });
  }
});

// POST /api/academic-calendar/upload -> accept single file form field 'file'
router.post("/upload", protect, upload.single("file"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const fileRecord = {
      originalName: req.file.originalname,
      name: req.file.filename,
      url: `/uploads/${encodeURIComponent(req.file.filename)}`,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
    };

    // Optionally, persist metadata to DB here. For now return the file meta.
    return res.json({ success: true, file: fileRecord });
  } catch (err) {
    console.error("Upload handler error:", err);
    return res.status(500).json({ success: false, message: "Upload failed" });
  }
});

// GET /api/academic-calendar/upload/:name/preview -> return parsed rows for Excel/CSV
router.get('/upload/:name/preview', protect, async (req, res) => {
  try {
    const { name } = req.params;
    if (!name) return res.status(400).json({ success: false, message: 'Filename required' });

    const uploadsDir = path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadsDir, name);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    // Authorization: only uploader or HOD of same department may preview
    const meta = readMetaForFile(name);
    if (!canAccessFile(req.user, meta)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const ext = path.extname(name).toLowerCase();
    if (!['.csv', '.xls', '.xlsx'].includes(ext)) {
      return res.status(400).json({ success: false, message: 'Preview not available for this file type' });
    }

    const workbook = new ExcelJS.Workbook();

    if (ext === '.csv') {
      await workbook.csv.readFile(filePath);
    } else {
      await workbook.xlsx.readFile(filePath);
    }

    const sheets = [];
    workbook.eachSheet((worksheet) => {
      const rows = [];
      worksheet.eachRow((row) => {
        const vals = row.values ? row.values.slice(1) : [];
        rows.push(vals.map((v) => (v === undefined || v === null ? '' : String(v))));
      });
      sheets.push({ name: worksheet.name, rows });
    });

    return res.json({ success: true, preview: { sheets } });
  } catch (err) {
    console.error('Error generating preview for file:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate preview' });
  }
});

// POST /api/academic-calendar/upload/:name/save -> overwrite the uploaded file with edited sheets
router.post('/upload/:name/save', protect, async (req, res) => {
  try {
    const { name } = req.params;
    const { sheets } = req.body;

    if (!name) return res.status(400).json({ success: false, message: 'Filename required' });
    if (!sheets || !Array.isArray(sheets)) return res.status(400).json({ success: false, message: 'Sheets data required' });

    const uploadsDir = path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadsDir, name);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    // Authorization: only uploader may save/overwrite
    const meta = readMetaForFile(name);
    if (!canModifyFile(req.user, meta)) {
      return res.status(403).json({ success: false, message: 'Only the original uploader can modify this file' });
    }

    const ext = path.extname(name).toLowerCase();

    // If original was CSV and only one sheet exists, write CSV; otherwise write XLSX
    if (ext === '.csv' && sheets.length === 1) {
      const rows = sheets[0].rows || [];
      // Build CSV with proper escaping
      const csvLines = rows.map((r) => r.map((cell) => {
        if (cell == null) return '';
        const s = String(cell);
        if (s.includes('"')) return '"' + s.replace(/"/g, '""') + '"';
        if (s.includes(',') || s.includes('\n') || s.includes('\r')) return '"' + s + '"';
        return s;
      }).join(','));

      fs.writeFileSync(filePath, csvLines.join('\n'), 'utf8');
    } else {
      const workbook = new ExcelJS.Workbook();
      for (const sheet of sheets) {
        const ws = workbook.addWorksheet(sheet.name || 'Sheet1');
        const rows = sheet.rows || [];
        for (const row of rows) {
          ws.addRow(row);
        }
      }
      await workbook.xlsx.writeFile(filePath);
    }

    const stats = fs.statSync(filePath);
    const metaForFile = readMetaForFile(name) || null;
    return res.json({ success: true, file: { name, url: `/uploads/${encodeURIComponent(name)}`, size: stats.size, uploadedAt: stats.mtime, meta: metaForFile } });
  } catch (err) {
    console.error('Error saving edited file:', err);
    return res.status(500).json({ success: false, message: 'Failed to save edited file' });
  }
});

// DELETE /api/academic-calendar/upload/:name -> delete uploaded file from server
router.delete('/upload/:name', protect, async (req, res) => {
  try {
    const { name } = req.params;
    if (!name) return res.status(400).json({ success: false, message: 'Filename required' });

    const uploadsDir = path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadsDir, name);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    // Authorization: only uploader may delete
    const meta = readMetaForFile(name);
    if (!canModifyFile(req.user, meta)) {
      return res.status(403).json({ success: false, message: 'Only the original uploader can delete this file' });
    }

    fs.unlinkSync(filePath);
    // Remove metadata file if present
    const metaPath = path.join(uploadsDir, `${name}.meta.json`);
    if (fs.existsSync(metaPath)) {
      try { fs.unlinkSync(metaPath); } catch (e) { console.warn('Failed removing meta file', metaPath, e); }
    }

    return res.json({ success: true, message: 'File deleted' });
  } catch (err) {
    console.error('Error deleting file:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete file' });
  }
});

// PATCH /api/academic-calendar/upload/:name -> rename stored file (provide newName without extension)
router.patch('/upload/:name', protect, async (req, res) => {
  try {
    const { name } = req.params;
    const { newName } = req.body;

    if (!name) return res.status(400).json({ success: false, message: 'Filename required' });
    if (!newName) return res.status(400).json({ success: false, message: 'newName is required' });

    const uploadsDir = path.join(process.cwd(), 'uploads');
    const oldPath = path.join(uploadsDir, name);

    if (!fs.existsSync(oldPath)) return res.status(404).json({ success: false, message: 'File not found' });

    // Authorization: only uploader may rename
    const oldMeta = readMetaForFile(name);
    if (!canModifyFile(req.user, oldMeta)) {
      return res.status(403).json({ success: false, message: 'Only the original uploader can rename this file' });
    }

    // Build safe filename preserving extension
    const ext = path.extname(name) || '';
    const safeBase = path.basename(newName).replace(/[^a-zA-Z0-9-_\\.]/g, '_');
    let newFileName = safeBase + ext;
    let newPath = path.join(uploadsDir, newFileName);

    // Avoid clobbering existing files
    if (fs.existsSync(newPath)) {
      const ts = Date.now();
      newFileName = `${safeBase}-${ts}${ext}`;
      newPath = path.join(uploadsDir, newFileName);
    }

    fs.renameSync(oldPath, newPath);

    // Move metadata file if present and update original name if requested
    try {
      const oldMetaPath = path.join(uploadsDir, `${name}.meta.json`);
      const newMetaPath = path.join(uploadsDir, `${newFileName}.meta.json`);
      if (fs.existsSync(oldMetaPath)) {
        try {
          const metaContent = JSON.parse(fs.readFileSync(oldMetaPath, 'utf8')) || {};
          if (req.body.originalName) metaContent.uploaderOriginalName = req.body.originalName;
          fs.writeFileSync(newMetaPath, JSON.stringify(metaContent));
          fs.unlinkSync(oldMetaPath);
        } catch (mErr) {
          console.warn('Failed to move or update meta file during rename', mErr);
        }
      } else if (req.body.originalName) {
        // Create a small meta file to preserve display name
        const newMeta = { uploaderOriginalName: req.body.originalName };
        try { fs.writeFileSync(newMetaPath, JSON.stringify(newMeta)); } catch(e){ console.warn('Failed to write new meta file', e); }
      }
    } catch(e) { console.warn('Meta rename handling error', e); }

    const stats = fs.statSync(newPath);
    const metaForFile = readMetaForFile(newFileName) || null;
    const fileRecord = {
      name: newFileName,
      originalName: req.body.originalName || newFileName,
      url: `/uploads/${encodeURIComponent(newFileName)}`,
      size: stats.size,
      uploadedAt: stats.mtime,
      meta: metaForFile,
    };

    return res.json({ success: true, file: fileRecord });
  } catch (err) {
    console.error('Error renaming file:', err);
    return res.status(500).json({ success: false, message: 'Failed to rename file' });
  }
});

router.get("/:id", getAcademicCalendarById);
router.put("/:id", protect, updateAcademicCalendar);
router.delete("/:id", protect, deleteAcademicCalendar);
router.patch("/:id/publish", protect, publishAcademicCalendar);

// Topic management
router.post("/:id/topics", protect, addTopicToCalendar);
router.patch("/:id/topics/:topicId", protect, updateTopicInCalendar);
router.delete("/:id/topics/:topicId", protect, deleteTopicFromCalendar);

// Helper endpoints for dropdowns
router.get("/faculty/subject/:subjectId", protect, getFacultyBySubject);
router.get("/subjects/department/:department", getSubjectsByDepartment);
router.get("/faculty/department/:department", getFacultyByDepartment);

// Uploads: list and POST an uploaded teaching plan file
// GET /api/academic-calendar/uploads -> returns list of uploaded files (public metadata)
router.get("/uploads", protect, async (req, res) => {
  try {
    const uploadsDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) {
      return res.json({ success: true, data: [] });
    }

    const allFiles = fs.readdirSync(uploadsDir).filter((f) => !f.endsWith('.meta.json'));
    const files = [];

    for (const fname of allFiles) {
      const fullPath = path.join(uploadsDir, fname);
      const stats = fs.statSync(fullPath);
      const meta = readMetaForFile(fname);

      // Skip files the user is not allowed to see
      if (!canAccessFile(req.user, meta)) continue;

      files.push({
        name: fname,
        originalName: (meta && meta.uploaderOriginalName) ? meta.uploaderOriginalName : fname,
        url: `/uploads/${encodeURIComponent(fname)}`,
        size: stats.size,
        uploadedAt: stats.mtime,
        meta,
      });
    }

    return res.json({ success: true, data: files });
  } catch (err) {
    console.error("Error listing uploaded plans:", err);
    return res.status(500).json({ success: false, message: "Failed to list uploads" });
  }
});

// POST /api/academic-calendar/upload -> accept single file form field 'file'
router.post("/upload", protect, upload.single("file"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const fileRecord = {
      originalName: req.file.originalname,
      name: req.file.filename,
      url: `/uploads/${encodeURIComponent(req.file.filename)}`,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
    };

    // Optionally, persist metadata to DB here. For now return the file meta.
    return res.json({ success: true, file: fileRecord });
  } catch (err) {
    console.error("Upload handler error:", err);
    return res.status(500).json({ success: false, message: "Upload failed" });
  }
});

// Academic Year/Semester/Schedule management (original endpoints)
router.post("/academic-year", protect, createAcademicYear);
router.post("/semester", protect, createSemester);
router.post("/subject-schedule", protect, createSubjectSchedule);
router.get("/faculty/:facultyId", getFacultyCalendar);
router.get("/department/:departmentId", getDepartmentCalendar);
router.get("/active-year", getActiveAcademicYear);
router.patch("/lecture-progress/:scheduleId", protect, updateLectureProgress);
router.post("/log-lecture", protect, logLecture);

export default router;
