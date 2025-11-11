import mongoose from 'mongoose'

const hotelSchema = new mongoose.Schema(
	{
		name: { type: String, required: true },
		slug: { type: String, index: true, unique: true, sparse: true },
		address: { type: String },
		city: { type: String, index: true },
		state: { type: String },
		zip: { type: String },
		description: { type: String },
		amenities: [{ type: String }],
		contactEmail: { type: String },
		contactPhone: { type: String },
		latitude: { type: Number },
		longitude: { type: Number },
		images: [{ type: String }],
		rating: { type: Number, default: 0 },
		policies: { type: Object },
		isActive: { type: Boolean, default: true },
	},
	{ timestamps: true }
)

export const Hotel = mongoose.models.Hotel || mongoose.model('Hotel', hotelSchema)
