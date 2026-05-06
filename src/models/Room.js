import mongoose from 'mongoose'

const roomSchema = new mongoose.Schema(
	{
		hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', index: true },
		name: { type: String, required: true, index: true },
		occupancy: { type: Number, default: 2 },
		inclusions: [{ type: String }],
		refundable: { type: Boolean, default: true },
		price: { type: Number, required: true },
		inventory: { type: Number, default: 0 },
		images: [{ type: String }],
		bedType: { type: String },
		// Optional metadata sent by the admin form (kept loose so the schema
		// doesn't drift from the UI every time we add a field).
		status: { type: String, enum: ['active', 'inactive'], default: 'active' },
		breakfastIncluded: { type: Boolean, default: false },
		zeroPayment: { type: Boolean, default: false },
		freeCancellation: { type: Boolean, default: false },
		freeCancellationUntil: { type: Date },
		perks: [{ type: String }],
		amenities: [{ type: String }],
		roomSizeSqft: { type: Number },
		bathrooms: { type: Number },
		view: { type: String },
		shortDescription: { type: String },
	},
	{ timestamps: true, strict: false }
)

export const Room = mongoose.models.Room || mongoose.model('Room', roomSchema)
