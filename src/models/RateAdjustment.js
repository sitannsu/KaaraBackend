import mongoose from 'mongoose'

const rateAdjustmentSchema = new mongoose.Schema(
	{
		hotelCode: { type: String, index: true, required: true },
		roomtypeunkid: { type: String, index: true, required: true },
		discount: {
			type: {
				type: String,
				enum: ['percentage', 'flat'],
				required: true,
				default: 'percentage',
			},
			value: { type: Number, required: true, default: 0 },
		},
	},
	{ timestamps: true }
)

rateAdjustmentSchema.index({ hotelCode: 1, roomtypeunkid: 1 }, { unique: true })

export const RateAdjustment =
	mongoose.models.RateAdjustment || mongoose.model('RateAdjustment', rateAdjustmentSchema)


