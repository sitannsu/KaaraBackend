import mongoose from 'mongoose';

const dir3KycSchema = new mongoose.Schema(
	{
		directorName: { type: String, required: true },
		din: { type: String, required: true, index: true, unique: true },
		dinStatus: { type: String, default: 'Active' },
		kycStatus: { type: String, default: 'Pending' },
		assignedUser: { type: String },
		userStatus: { type: String, default: 'Active' },
		remark: { type: String },
		mcaUser: { type: String },
		lastSubmittedOnMca: { type: Date },
		srn: { type: String },
		isActive: { type: Boolean, default: true },
	},
	{ timestamps: true }
);

export const Dir3Kyc = mongoose.models.Dir3Kyc || mongoose.model('Dir3Kyc', dir3KycSchema);
