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
import mammoth from "mammoth";
import axios from 'axios';
import cloudinary, { uploadToCloudinary } from '../config/cloudinary.js';
import UploadedTeachingPlan from '../models/UploadedTeachingPlan.js';

const router = express.Router();

// Academic Calendar CRUD operations (for frontend)
router.get("/", protect, getAcademicCalendars);
router.post("/", protect, createAcademicCalendar);

// POST /api/academic-calendar/upload -> Upload file to Cloudinary and save to MongoDB
router.post("/upload", protect, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      const message = req.fileValidationError || "No file uploaded";
      return res.status(400).json({ success: false, message });
    }

    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExt = path.extname(req.file.originalname);
    const filename = 'file-' + uniqueSuffix + fileExt;

    // Upload to Cloudinary (resource_type 'auto' for documents)
    let cloudinaryUrl = null;
    let cloudinaryPublicId = null;
    
    try {
      const uploadResult = await uploadToCloudinary(
        req.file.buffer,
        'academic-calendar',
        'auto' // auto-detect resource type
      );
      cloudinaryUrl = uploadResult.secure_url;
      cloudinaryPublicId = uploadResult.public_id;
      console.log('✅ File uploaded to Cloudinary:', cloudinaryUrl);
    } catch (cloudinaryErr) {
      console.error('❌ Cloudinary upload error:', cloudinaryErr);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to upload to Cloudinary', 
        error: cloudinaryErr.message 
      });
    }

    // Get file type
    const fileType = fileExt.replace('.', '').toLowerCase();

    // Get user department
    const userDepartment = req.user.department?._id || req.user.department || 'Unknown';

    // Save to MongoDB
    const uploadedFile = new UploadedTeachingPlan({
      originalName: req.file.originalname,
      fileName: filename,
      cloudinaryUrl: cloudinaryUrl,
      cloudinaryPublicId: cloudinaryPublicId,
      fileType: fileType,
      size: req.file.size,
      department: userDepartment,
      uploadedBy: req.user._id,
      uploaderName: req.user.firstName || req.user.name || 'Unknown',
    });

    await uploadedFile.save();
    console.log('✅ File metadata saved to MongoDB:', uploadedFile._id);

    const fileRecord = {
      _id: uploadedFile._id,
      originalName: uploadedFile.originalName,
      name: uploadedFile.fileName,
      url: uploadedFile.cloudinaryUrl,
      size: uploadedFile.size,
      uploadedAt: uploadedFile.createdAt,
      meta: {
        uploaderId: uploadedFile.uploadedBy,
        uploaderName: uploadedFile.uploaderName,
        uploaderDepartment: uploadedFile.department,
      }
    };

    return res.json({ success: true, file: fileRecord });
  } catch (err) {
    console.error("❌ Upload handler error:", err);
    return res.status(500).json({ success: false, message: err.message || "Upload failed" });
  }
});

// GET /api/academic-calendar/uploads -> List uploaded files from MongoDB
router.get("/uploads", protect, async (req, res) => {
  try {
    const userDepartment = req.user.department?._id || req.user.department;
    const userId = req.user._id;
    const userRole = String(req.user.role || '').toLowerCase();

    // Build query based on role
    let query = {};
    
    if (userRole === 'hod') {
      // HOD sees all files from their department
      query.department = userDepartment;
    } else {
      // Others see only their own uploads
      query.uploadedBy = userId;
    }

    const files = await UploadedTeachingPlan.find(query)
      .sort({ createdAt: -1 })
      .lean();

    const formattedFiles = files.map(file => ({
      _id: file._id,
      name: file.fileName,
      originalName: file.originalName,
      url: file.cloudinaryUrl,
      size: file.size,
      uploadedAt: file.createdAt,
      meta: {
        uploaderId: file.uploadedBy,
        uploaderName: file.uploaderName,
        uploaderDepartment: file.department,
        originalName: file.originalName,
      }
    }));

    return res.json({ success: true, data: formattedFiles });
  } catch (err) {
    console.error("❌ Error listing uploaded plans:", err);
    return res.status(500).json({ success: false, message: "Failed to list uploads" });
  }
});

// POST /api/academic-calendar/upload -> accept single file form field 'file'
router.post("/upload", protect, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'file-' + uniqueSuffix + path.extname(req.file.originalname);

    // Upload to Cloudinary
    let cloudinaryUrl = null;
    try {
      const uploadResult = await uploadToCloudinary(
        req.file.buffer,
        'academic-calendar',
        'auto' // auto-detect resource type (document/image)
      );
      cloudinaryUrl = uploadResult.secure_url;
      console.log('File uploaded to Cloudinary:', cloudinaryUrl);
    } catch (cloudinaryErr) {
      console.error('Cloudinary upload error:', cloudinaryErr);
      return res.status(500).json({ success: false, message: 'Failed to upload to Cloudinary', error: cloudinaryErr.message });
    }

    // Also save file locally as backup (create uploads dir if not exists)
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const localPath = path.join(uploadsDir, filename);
    fs.writeFileSync(localPath, req.file.buffer);

    // Create metadata file
    const meta = {
      originalName: req.file.originalname,
      name: filename,
      url: cloudinaryUrl, // Store Cloudinary URL
      localPath: `/uploads/${filename}`,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
      uploaderId: req.user._id,
      uploaderName: req.user.firstName || req.user.name || 'Unknown',
      uploaderDepartment: req.user.department?._id || req.user.department,
    };
    const metaPath = path.join(uploadsDir, filename + '.meta.json');
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

    const fileRecord = {
      originalName: req.file.originalname,
      name: filename,
      url: cloudinaryUrl, // Return Cloudinary URL to frontend
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
      meta: {
        uploaderId: req.user._id,
        uploaderName: req.user.firstName || req.user.name || 'Unknown',
        uploaderDepartment: req.user.department?._id || req.user.department,
      }
    };

    return res.json({ success: true, file: fileRecord });
  } catch (err) {
    console.error("Upload handler error:", err);
    return res.status(500).json({ success: false, message: err.message || "Upload failed" });
  }
});

// GET /api/academic-calendar/upload/:id/preview -> Download from Cloudinary and preview
router.get('/upload/:id/preview', protect, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'File ID required' });

    // Find file in MongoDB
    const file = await UploadedTeachingPlan.findById(id);
    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    // Check permissions
    const userId = String(req.user._id);
    const userRole = String(req.user.role || '').toLowerCase();
    const userDept = String(req.user.department?._id || req.user.department || '');
    const fileUploader = String(file.uploadedBy);
    const fileDept = String(file.department);

    const canAccess = (fileUploader === userId) || (userRole === 'hod' && fileDept === userDept);
    
    if (!canAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Download file from Cloudinary
    let fileBuffer;
    try {
      const response = await axios.get(file.cloudinaryUrl, { responseType: 'arraybuffer' });
      fileBuffer = Buffer.from(response.data);
    } catch (downloadErr) {
      console.error('Failed to download file from Cloudinary:', downloadErr);
      return res.status(500).json({ success: false, message: 'Failed to fetch file for preview' });
    }

    const ext = path.extname(file.originalName).toLowerCase();

    // Support DOCX (plain-text extract)
    if (ext === '.docx') {
      try {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        const text = result && result.value ? String(result.value) : '';
        const truncated = text.length > 100000 ? text.slice(0, 100000) + '\n\n[truncated]' : text;
        return res.json({ 
          success: true, 
          preview: { text: truncated },
          file: {
            meta: {
              uploaderId: file.uploadedBy,
              uploaderName: file.uploaderName,
              uploaderDepartment: file.department,
            }
          }
        });
      } catch (err) {
        console.error('Error converting DOCX for preview:', err);
        return res.status(500).json({ success: false, message: 'Failed to generate DOCX preview' });
      }
    }

    // Support CSV/XLS/XLSX
    if (!['.csv', '.xls', '.xlsx'].includes(ext)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Preview not available for this file type',
        file: {
          meta: {
            uploaderId: file.uploadedBy,
            uploaderName: file.uploaderName,
            uploaderDepartment: file.department,
          }
        }
      });
    }

    const workbook = new ExcelJS.Workbook();

    try {
      if (ext === '.csv') {
        // For CSV, write buffer to temp file
        const tmpPath = path.join(process.cwd(), `tmp-${Date.now()}.csv`);
        fs.writeFileSync(tmpPath, fileBuffer);
        await workbook.csv.readFile(tmpPath);
        fs.unlinkSync(tmpPath);
      } else {
        // For Excel, load from buffer
        await workbook.xlsx.load(fileBuffer);
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

      return res.json({ 
        success: true, 
        preview: { sheets },
        file: {
          meta: {
            uploaderId: file.uploadedBy,
            uploaderName: file.uploaderName,
            uploaderDepartment: file.department,
          }
        }
      });
    } catch (readErr) {
      console.error('Error reading workbook for preview:', readErr);
      return res.status(500).json({ success: false, message: 'Failed to generate preview' });
    }
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

    // Authorization: only uploader may save/overwrite
    const meta = readMetaForFile(name);
    if (!canModifyFile(req.user, meta)) {
      return res.status(403).json({ success: false, message: 'Only the original uploader can modify this file' });
    }

    const ext = path.extname(name).toLowerCase();

    // Helper to write sheets to a given path
    const writeSheetsToPath = async (targetPath) => {
      if (ext === '.csv' && sheets.length === 1) {
        const rows = sheets[0].rows || [];
        const csvLines = rows.map((r) => r.map((cell) => {
          if (cell == null) return '';
          const s = String(cell);
          if (s.includes('"')) return '"' + s.replace(/"/g, '""') + '"';
          if (s.includes(',') || s.includes('\n') || s.includes('\r')) return '"' + s + '"';
          return s;
        }).join(','));

        fs.writeFileSync(targetPath, csvLines.join('\n'), 'utf8');
      } else {
        const workbook = new ExcelJS.Workbook();
        for (const sheet of sheets) {
          const ws = workbook.addWorksheet(sheet.name || 'Sheet1');
          const rows = sheet.rows || [];
          for (const row of rows) {
            ws.addRow(row);
          }
        }
        await workbook.xlsx.writeFile(targetPath);
      }
    };

    // If local file exists, overwrite it and (if cloud-backed) push update to Cloudinary
    if (fs.existsSync(filePath)) {
      await writeSheetsToPath(filePath);

      // If meta references Cloudinary, upload new version and update meta
      if (meta && meta.public_id) {
        try {
          const buffer = fs.readFileSync(filePath);
          const result = await uploadToCloudinary(buffer, 'academic_calendar', 'auto');
          // Update meta file
          const metaPath = path.join(uploadsDir, `${name}.meta.json`);
          const newMeta = { ...meta, public_id: result.public_id, url: result.secure_url, size: fs.statSync(filePath).size, uploadedAt: new Date().toISOString() };
          fs.writeFileSync(metaPath, JSON.stringify(newMeta));

          // Optionally delete old cloud resource (if public_id changed)
          if (meta.public_id && meta.public_id !== result.public_id) {
            try { await cloudinary.uploader.destroy(meta.public_id, { resource_type: 'auto' }); } catch(e) { console.warn('Failed to remove old cloud resource:', e); }
          }

          return res.json({ success: true, file: { name, url: result.secure_url, size: fs.statSync(filePath).size, uploadedAt: new Date().toISOString(), meta: newMeta } });
        } catch (cloudErr) {
          console.warn('Cloud update failed, keeping local file updated:', cloudErr);
          const stats = fs.statSync(filePath);
          const metaForFile = readMetaForFile(name) || null;
          return res.json({ success: true, file: { name, url: `/uploads/${encodeURIComponent(name)}`, size: stats.size, uploadedAt: stats.mtime, meta: metaForFile } });
        }
      }

      const stats = fs.statSync(filePath);
      const metaForFile = readMetaForFile(name) || null;
      return res.json({ success: true, file: { name, url: `/uploads/${encodeURIComponent(name)}`, size: stats.size, uploadedAt: stats.mtime, meta: metaForFile } });
    }

    // If local file doesn't exist but we have a cloud URL/meta, download remote, write, upload back and update meta
    if (meta && meta.url) {
      const tmpPath = path.join(uploadsDir, `tmp-save-${Date.now()}-${name}`);
      try {
        const resp = await axios.get(meta.url, { responseType: 'arraybuffer' });
        fs.writeFileSync(tmpPath, Buffer.from(resp.data));

        await writeSheetsToPath(tmpPath);

        // Upload updated file back to Cloudinary
        const updatedBuffer = fs.readFileSync(tmpPath);
        const result = await uploadToCloudinary(updatedBuffer, 'academic_calendar', 'auto');

        // Remove temporary file
        try { fs.unlinkSync(tmpPath); } catch(e){}

        // Delete old cloud resource if present
        if (meta.public_id && meta.public_id !== result.public_id) {
          try { await cloudinary.uploader.destroy(meta.public_id, { resource_type: 'auto' }); } catch(e) { console.warn('Failed to remove old cloud resource after save:', e); }
        }

        const metaPath = path.join(uploadsDir, `${name}.meta.json`);
        const newMeta = { ...meta, public_id: result.public_id, url: result.secure_url, size: updatedBuffer.length, uploadedAt: new Date().toISOString() };
        fs.writeFileSync(metaPath, JSON.stringify(newMeta));

        return res.json({ success: true, file: { name, url: result.secure_url, size: updatedBuffer.length, uploadedAt: new Date().toISOString(), meta: newMeta } });
      } catch (err) {
        if (fs.existsSync(tmpPath)) try { fs.unlinkSync(tmpPath); } catch(e){}
        console.error('Error saving edited cloud file:', err);
        return res.status(500).json({ success: false, message: 'Failed to save edited file' });
      }
    }

    return res.status(404).json({ success: false, message: 'File not found' });
  } catch (err) {
    console.error('Error saving edited file:', err);
    return res.status(500).json({ success: false, message: 'Failed to save edited file' });
  }
});

// DELETE /api/academic-calendar/upload/:id -> Delete file from Cloudinary and MongoDB
router.delete('/upload/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'File ID required' });

    // Find file in MongoDB
    const file = await UploadedTeachingPlan.findById(id);
    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    // Check permissions - only uploader can delete
    const userId = String(req.user._id);
    const fileUploader = String(file.uploadedBy);

    if (fileUploader !== userId) {
      return res.status(403).json({ success: false, message: 'Only the original uploader can delete this file' });
    }

    // Delete from Cloudinary
    if (file.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(file.cloudinaryPublicId, { resource_type: 'auto' });
        console.log('✅ File deleted from Cloudinary:', file.cloudinaryPublicId);
      } catch (cloudErr) {
        console.warn('⚠️ Cloud delete failed:', cloudErr);
        // Continue anyway to delete from database
      }
    }

    // Delete from MongoDB
    await UploadedTeachingPlan.findByIdAndDelete(id);
    console.log('✅ File metadata deleted from MongoDB:', id);

    return res.json({ success: true, message: 'File deleted' });
  } catch (err) {
    console.error('❌ Error deleting file:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete file' });
  }
});

// Legacy PATCH route for renaming (can be removed if not needed)
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
