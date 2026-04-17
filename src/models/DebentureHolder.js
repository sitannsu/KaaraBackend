import mongoose from 'mongoose';

const debentureHolderSchema = new mongoose.Schema(
	{
		director: { type: String },
		category: { type: String, required: true },
		subCategory: { type: String },
		underSubCategory: { type: String },
		name: { type: String, required: true },
		fathersName: { type: String },
		mothersName: { type: String },
		addressLine1: { type: String },
		country: { type: String },
		state: { type: String },
		city: { type: String },
		pinCode: { type: String },
		gender: { type: String },
		pan: { type: String, required: true, unique: true },
		dob: { type: Date },
		aadhar: { type: String },
		nationality: { type: String },
		voterId: { type: String },
		email: { type: String, required: true },
		mobile: { type: String, required: true },
		maritalStatus: { type: String },
		spouseName: { type: String },
		occupation: { type: String },
		guardianName: { type: String },
		cin: { type: String },
		incorporationDate: { type: Date },
		panFile: { type: String },
		aadharFile: { type: String },
		isActive: { type: Boolean, default: true },
	},
	{ timestamps: true }
);

export const DebentureHolder = mongoose.models.DebentureHolder || mongoose.model('DebentureHolder', debentureHolderSchema);
