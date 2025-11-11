import mongoose from 'mongoose'

const paymentSchema = new mongoose.Schema(
	{
		bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', index: true },
		provider: { type: String },
		txnId: { type: String },
		amount: { type: Number },
		status: { type: String, enum: ['created', 'paid', 'failed', 'refunded'], default: 'created' },
	},
	{ timestamps: true }
)

export const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema)
