import mongoose from 'mongoose'

const adminSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true }, // hashed password
  },
  { timestamps: true }
)

export const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema)