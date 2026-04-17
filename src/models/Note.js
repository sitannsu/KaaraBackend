import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
	{
		title: { type: String, required: true },
		description: { type: String },
		labels: [{ type: String }],
		files: [{ type: String }],
		isActive: { type: Boolean, default: true },
	},
	{ timestamps: true }
);

export const Note = mongoose.models.Note || mongoose.model('Note', noteSchema);
