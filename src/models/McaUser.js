import mongoose from 'mongoose';

const mcaUserSchema = new mongoose.Schema(
	{
		username: { type: String, index: true }, // For V2
		password: { type: String }, // For V2
		email: { type: String, index: true }, // For V3
		version: { type: String, enum: ['V2', 'V3'], required: true },
		lastUpdatedOn: { type: Date, default: Date.now },
		isActive: { type: Boolean, default: true },
	},
	{ timestamps: true }
);

export const McaUser = mongoose.models.McaUser || mongoose.model('McaUser', mcaUserSchema);
