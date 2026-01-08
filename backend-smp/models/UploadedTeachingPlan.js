import mongoose from "mongoose";

const uploadedTeachingPlanSchema = mongoose.Schema(
  {
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    fileName: {
      type: String,
      required: true,
      unique: true,
    },
    cloudinaryUrl: {
      type: String,
      required: true,
    },
    cloudinaryPublicId: {
      type: String,
    },
    fileType: {
      type: String,
      enum: ['csv', 'xlsx', 'xls', 'docx', 'doc', 'pdf'],
    },
    size: {
      type: Number,
    },
    department: {
      type: String,
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
    },
    uploaderName: {
      type: String,
      required: true,
    },
    academicYear: {
      type: String,
    },
    semester: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
uploadedTeachingPlanSchema.index({ department: 1, uploadedBy: 1 });
uploadedTeachingPlanSchema.index({ academicYear: 1, semester: 1 });

export default mongoose.models.UploadedTeachingPlan || 
  mongoose.model("UploadedTeachingPlan", uploadedTeachingPlanSchema);
