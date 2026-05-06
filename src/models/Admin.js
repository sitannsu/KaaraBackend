import mongoose from 'mongoose'

const adminSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['superadmin', 'subadmin'], default: 'subadmin', index: true },
    permissions: [{ type: String }],
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
)

export const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema)
