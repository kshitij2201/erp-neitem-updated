import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subject: { type: String }, // Added subject field
  semester: { type: String, required: true },
  section: { type: String, required: true },
  uploaderName: { type: String },
  uploaderDepartment: { type: String }, // Added sender's department
  uploaderId: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty" }, // Added sender's ID for reference
  filePath: { type: String }, // Made optional for backward compatibility
  cloudinaryUrl: { type: String }, // URL of file in Cloudinary
  cloudinaryPublicId: { type: String }, // Public ID for file in Cloudinary
  originalName: { type: String }, // Original filename
  fileSize: { type: Number }, // File size in bytes
  mimeType: { type: String }, // File MIME type
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("File", fileSchema);
