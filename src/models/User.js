import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
	{
		name: { type: String },
		phone: { type: String, index: true, unique: true, sparse: true },
		email: { type: String, index: true, unique: true, sparse: true },
		verified: { type: Boolean, default: false },
		points: { type: Number, default: 0 },
	},
	{ timestamps: true }
)

export const User = mongoose.models.User || mongoose.model('User', userSchema)
