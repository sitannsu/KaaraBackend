import mongoose from 'mongoose'

const roomSchema = new mongoose.Schema(
	{
		hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', index: true },
		name: { type: String, required: true },
		occupancy: { type: Number, default: 2 },
		inclusions: [{ type: String }],
		refundable: { type: Boolean, default: true },
		price: { type: Number, required: true },
		inventory: { type: Number, default: 0 },
		images: [{ type: String }],
		bedType: { type: String },
	},
	{ timestamps: true }
)

export const Room = mongoose.models.Room || mongoose.model('Room', roomSchema)
