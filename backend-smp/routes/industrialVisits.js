import express from 'express';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import { protect } from '../middleware/auth.js';
import IndustrialVisit from '../models/IndustrialVisit.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

const router = express.Router();

// Helper: optional authentication (accepts token if present but doesn't fail when absent/invalid)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attach decoded token info if needed
  } catch (err) {
    // invalid token -> ignore for optional auth
    console.warn('optionalAuth: invalid token', err.message);
  }
  return next();
};

// multer memory storage for immediate processing (upload to Cloudinary)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 6 } });

// Create an industrial visit (supports multipart/form-data with files named `images`)
router.post('/', protect, upload.array('images', 6), async (req, res) => {
  try {
    // text fields come in req.body; files (if any) in req.files
    const { title, company, location, industryType, department, semester, image, images } = req.body;
    if (!title || !company || !location) return res.status(400).json({ success: false, message: 'Missing required fields' });

    let imagesToSave = [];

    if (req.files && req.files.length > 0) {
      // Upload each file buffer to Cloudinary and collect secure URLs
      const uploadPromises = req.files.map((f) => uploadToCloudinary(f.buffer, 'industrial-visits', 'image'));
      const uploadResults = await Promise.all(uploadPromises);
      imagesToSave = uploadResults.map((r) => r.secure_url || r.url).filter(Boolean);
    } else {
      // fallback to legacy JSON payload (images could be an array of data URLs)
      imagesToSave = Array.isArray(images) ? images : image ? [image] : [];
    }

    const visit = await IndustrialVisit.create({
      title,
      company,
      location,
      industryType,
      department,
      semester,
      images: imagesToSave,
      createdBy: req.user?._id,
    });

    return res.json({ success: true, data: visit });
  } catch (err) {
    console.error('Create industrial visit error', err);

    // Multer file size / file count errors come through as a MulterError
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, message: 'One of the uploaded files is too large' });
    }

    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// List industrial visits (optional ?department= & ?creatorRole=)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { department, creatorRole } = req.query;
    const filter = {};
    if (department) filter.department = department;

    // Populate createdBy so we can inspect the creator's role if needed
    let visits = await IndustrialVisit.find(filter).populate('createdBy', 'role firstName lastName').sort({ createdAt: -1 }).lean();

    // If caller requested filtering by creator role (e.g., students should only see CC-created visits)
    if (creatorRole) {
      visits = visits.filter((v) => v.createdBy && String(v.createdBy.role).toLowerCase() === String(creatorRole).toLowerCase());
    }

    return res.json({ success: true, data: visits });
  } catch (err) {
    console.error('List industrial visits error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete a visit
router.delete('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;

    // Ensure authenticated user info is present
    if (!req.user) {
      console.warn('Delete attempted without authenticated user');
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const visit = await IndustrialVisit.findById(id);
    if (!visit) return res.status(404).json({ success: false, message: 'Not found' });

    // Resolve creator id robustly (handle populated or plain ObjectId)
    const creatorId = visit.createdBy && visit.createdBy._id ? String(visit.createdBy._id) : String(visit.createdBy || '');
    const requesterId = req.user._id ? String(req.user._id) : String(req.user.id || '');
    const requesterRole = String(req.user.role || '').toLowerCase();

    // Allow only creator, HOD, or super_admin to delete
    if (creatorId !== requesterId && requesterRole !== 'hod' && requesterRole !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Delete the visit document
    await IndustrialVisit.findByIdAndDelete(id);

    // Note: if you want to remove remote images from Cloudinary, implement here using stored public_id

    return res.json({ success: true });
  } catch (err) {
    console.error('Delete industrial visit error', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

export default router;