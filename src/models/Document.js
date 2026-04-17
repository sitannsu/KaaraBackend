import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
	{
		isinId: { type: mongoose.Schema.Types.ObjectId, ref: 'Isin', required: true },
		title: { type: String, required: true },
		wordFileUrl: { type: String },
		pdfFileUrl: { type: String },
		uploadedFileUrl: { type: String },
		type: { type: String, enum: ['CORE', 'ATTACHMENT'], default: 'CORE' },
		isActive: { type: Boolean, default: true },
	},
	{ timestamps: true }
);

export const Document = mongoose.models.Document || mongoose.model('Document', documentSchema);
