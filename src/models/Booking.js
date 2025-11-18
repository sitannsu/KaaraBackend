import mongoose from 'mongoose'

const bookingSchema = new mongoose.Schema(
	{
		userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
		hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: false },
		hotelSlug: { type: String }, // Store slug if hotelId lookup fails
		roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
		from: { type: Date, required: true },
		to: { type: Date, required: true },
		total: { type: Number, required: true },
		addOns: [{ type: String }],
		paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
		status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' },
		guestName: { type: String },
		email: { type: String }, // external email used (hardcoded for now)
		externalProvider: { type: String }, // e.g., 'ipms247'
		externalReservationId: { type: String },
		externalPayload: { type: Object },
		externalResponse: { type: Object },
	},
	{ timestamps: true }
)

export const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema)
