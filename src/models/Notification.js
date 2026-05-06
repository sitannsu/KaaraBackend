import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
	{
		title: { type: String, required: true },
		message: { type: String, required: true },
		type: { type: String, enum: ['offer', 'announcement', 'update', 'alert'], default: 'announcement' },
		// If null, sent to all users. If set, sent to specific user
		userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
		// Track delivery status for each user
		recipients: [{
			userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
			read: { type: Boolean, default: false },
			readAt: { type: Date, default: null },
		}],
		// Metadata for analytics
		sentCount: { type: Number, default: 0 },
		readCount: { type: Number, default: 0 },
		// Optional: link to open when notification is clicked
		actionLink: { type: String, default: null },
		// Optional: image URL for the notification
		imageUrl: { type: String, default: null },
		// Scheduled time (if scheduled for future)
		scheduledAt: { type: Date, default: null },
		// Is this a broadcast to all users?
		isBroadcast: { type: Boolean, default: false },
		// Sent by which admin
		sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
	},
	{ timestamps: true }
)

// Index for efficient queries
notificationSchema.index({ userId: 1, createdAt: -1 })
notificationSchema.index({ isBroadcast: 1, createdAt: -1 })
notificationSchema.index({ 'recipients.userId': 1 })

export const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema)
