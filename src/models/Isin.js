import mongoose from 'mongoose';

const isinSchema = new mongoose.Schema(
	{
		cin: { type: String, required: true },
		depository: { type: String, enum: ['NSDL', 'CDSL', 'Both'] },
		securityType: { type: String, enum: ['Equity', 'Preference', 'Debenture'] },
		securityName: { type: String, required: true },
		faceValue: { type: Number },
		paidUpValue: { type: Number },
		
		// Resolution Details
		approvalMode: { type: String, enum: ['In Board meeting', 'By Circular Resolution'] },
		meetingDate: { type: Date },
		meetingTime: { type: String },
		authorizedSignatories: [{ type: String }],
		
		// Signing Details
		signingSignatory1: { type: String },
		signingSignatory1Address: { type: String },
		signingSignatory2: { type: String },
		signingSignatory2Address: { type: String },
		ctcSigningDate: { type: Date },
		ctcSigningPlace: { type: String },
		
		// Declaration Details
		signingPerson: { type: String },
		declarationSigningDate: { type: Date },
		declarationSigningPlace: { type: String },

		// Networth Details
		networthDate: { type: Date },
		paidUpCapital: { type: Number },
		reserveSurplus: { type: Number },
		accumulatedLosses: { type: Number },
		miscellaneousExpenditure: { type: Number },
		totalNetworth: { type: Number },
		totalOutstandingShares: { type: Number },
		bookValuePerShare: { type: Number },

		// Certificate signing details
		certificateCategory: { type: String },
		certificateFirmName: { type: String },
		certificateFirmAddress: { type: String },
		certificatePcsName: { type: String },
		certificateUdin: { type: String },
		certificateEmail: { type: String },
		certificateContactNo: { type: String },
		certificateWebsite: { type: String },
		certificateDateOfSigning: { type: Date },
		certificatePlaceOfSigning: { type: String },

		// Fees
		totalShares: { type: Number },
		feeAmount: { type: Number },

		// Payment Details
		isPaid: { type: Boolean, default: false },
		paymentBankName: { type: String },
		paymentDate: { type: Date },
		paymentRefNo: { type: String }, // UTR / Cheque / DD
		paymentMode: { type: String }, // NEFT / RTGS / etc
		paymentAmount: { type: Number },
		tdsAmount: { type: Number },
		
		isActive: { type: Boolean, default: true },
	},
	{ timestamps: true }
);

export const Isin = mongoose.models.Isin || mongoose.model('Isin', isinSchema);
