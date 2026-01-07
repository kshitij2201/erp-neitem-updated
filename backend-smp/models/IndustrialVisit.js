import mongoose from 'mongoose';

const IndustrialVisitSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, required: true },
  industryType: { type: String },
  department: { type: String },
  semester: { type: String },
  images: { type: [String], default: [] }, // store base64 or image URLs
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.IndustrialVisit || mongoose.model('IndustrialVisit', IndustrialVisitSchema);