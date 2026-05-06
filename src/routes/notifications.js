import { Router } from 'express';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';

export const router = Router();

// POST /api/notifications/send-to-all - Send notification to all users
router.post('/send-to-all', async (req, res) => {
	try {
		const { title, message, type = 'announcement', actionLink, imageUrl } = req.body;

		if (!title || !message) {
			return res.status(400).json({
				success: false,
				message: 'Title and message are required'
			});
		}

		// Get all users
		const users = await User.find({}, '_id');
		const userIds = users.map(u => u._id);

		// Create recipients array
		const recipients = userIds.map(userId => ({
			userId,
			read: false,
			readAt: null
		}));

		// Create the notification
		const notification = new Notification({
			title,
			message,
			type,
			isBroadcast: true,
			recipients,
			sentCount: userIds.length,
			actionLink,
			imageUrl,
			sentBy: req.user?._id || null
		});

		await notification.save();

		return res.json({
			success: true,
			message: `Notification sent to ${userIds.length} users`,
			data: {
				notificationId: notification._id,
				recipientCount: userIds.length
			}
		});
	} catch (error) {
		console.error('Error sending notification:', error);
		return res.status(500).json({
			success: false,
			message: 'Internal Server Error'
		});
	}
});

// POST /api/notifications/send-to-user - Send notification to specific user
router.post('/send-to-user', async (req, res) => {
	try {
		const { userId, title, message, type = 'announcement', actionLink, imageUrl } = req.body;

		if (!userId || !title || !message) {
			return res.status(400).json({
				success: false,
				message: 'User ID, title, and message are required'
			});
		}

		// Verify user exists
		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({
				success: false,
				message: 'User not found'
			});
		}

		// Create the notification
		const notification = new Notification({
			title,
			message,
			type,
			userId,
			isBroadcast: false,
			recipients: [{ userId, read: false, readAt: null }],
			sentCount: 1,
			actionLink,
			imageUrl,
			sentBy: req.user?._id || null
		});

		await notification.save();

		return res.json({
			success: true,
			message: 'Notification sent successfully',
			data: { notificationId: notification._id }
		});
	} catch (error) {
		console.error('Error sending notification:', error);
		return res.status(500).json({
			success: false,
			message: 'Internal Server Error'
		});
	}
});

// GET /api/notifications - List all notifications (admin view)
router.get('/', async (req, res) => {
	try {
		const { page = 1, limit = 20, type } = req.query;

		const query = {};
		if (type) query.type = type;

		const notifications = await Notification.find(query)
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(parseInt(limit))
			.populate('sentBy', 'name email');

		const total = await Notification.countDocuments(query);

		return res.json({
			success: true,
			data: notifications,
			pagination: {
				page: parseInt(page),
				limit: parseInt(limit),
				total,
				totalPages: Math.ceil(total / limit)
			}
		});
	} catch (error) {
		console.error('Error fetching notifications:', error);
		return res.status(500).json({
			success: false,
			message: 'Internal Server Error'
		});
	}
});

// GET /api/notifications/stats - Get notification statistics
router.get('/stats', async (req, res) => {
	try {
		const totalNotifications = await Notification.countDocuments();
		const broadcastCount = await Notification.countDocuments({ isBroadcast: true });
		const totalSent = await Notification.aggregate([
			{ $group: { _id: null, total: { $sum: '$sentCount' } } }
		]);
		const totalRead = await Notification.aggregate([
			{ $group: { _id: null, total: { $sum: '$readCount' } } }
		]);

		return res.json({
			success: true,
			data: {
				totalNotifications,
				broadcastCount,
				totalSent: totalSent[0]?.total || 0,
				totalRead: totalRead[0]?.total || 0
			}
		});
	} catch (error) {
		console.error('Error fetching notification stats:', error);
		return res.status(500).json({
			success: false,
			message: 'Internal Server Error'
		});
	}
});

// GET /api/notifications/:id - Get single notification details
router.get('/:id', async (req, res) => {
	try {
		const notification = await Notification.findById(req.params.id)
			.populate('recipients.userId', 'name email phone')
			.populate('sentBy', 'name email');

		if (!notification) {
			return res.status(404).json({
				success: false,
				message: 'Notification not found'
			});
		}

		return res.json({
			success: true,
			data: notification
		});
	} catch (error) {
		console.error('Error fetching notification:', error);
		return res.status(500).json({
			success: false,
			message: 'Internal Server Error'
		});
	}
});

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', async (req, res) => {
	try {
		const notification = await Notification.findByIdAndDelete(req.params.id);

		if (!notification) {
			return res.status(404).json({
				success: false,
				message: 'Notification not found'
			});
		}

		return res.json({
			success: true,
			message: 'Notification deleted successfully'
		});
	} catch (error) {
		console.error('Error deleting notification:', error);
		return res.status(500).json({
			success: false,
			message: 'Internal Server Error'
		});
	}
});

// GET /api/notifications/user/:userId - Get notifications for a specific user (mobile app)
router.get('/user/:userId', async (req, res) => {
	try {
		const { page = 1, limit = 20, unreadOnly = false } = req.query;
		const { userId } = req.params;

		// Build query to find notifications for this user
		// (either broadcast notifications or user-specific notifications)
		const query = {
			$or: [
				{ isBroadcast: true },
				{ userId: userId }
			],
			'recipients.userId': userId
		};

		if (unreadOnly === 'true') {
			query['recipients.read'] = false;
		}

		const notifications = await Notification.find(query)
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(parseInt(limit))
			.select('-recipients');

		// Get unread count
		const unreadCount = await Notification.countDocuments({
			$or: [
				{ isBroadcast: true },
				{ userId: userId }
			],
			'recipients.userId': userId,
			'recipients.read': false
		});

		return res.json({
			success: true,
			data: notifications,
			unreadCount,
			pagination: {
				page: parseInt(page),
				limit: parseInt(limit)
			}
		});
	} catch (error) {
		console.error('Error fetching user notifications:', error);
		return res.status(500).json({
			success: false,
			message: 'Internal Server Error'
		});
	}
});

// PATCH /api/notifications/:id/read - Mark notification as read (mobile app)
router.patch('/:id/read', async (req, res) => {
	try {
		const { userId } = req.body;
		const { id } = req.params;

		if (!userId) {
			return res.status(400).json({
				success: false,
				message: 'User ID is required'
			});
		}

		const notification = await Notification.findById(id);
		if (!notification) {
			return res.status(404).json({
				success: false,
				message: 'Notification not found'
			});
		}

		// Find and update the recipient's read status
		const recipientIndex = notification.recipients.findIndex(
			r => r.userId.toString() === userId
		);

		if (recipientIndex === -1) {
			return res.status(404).json({
				success: false,
				message: 'User not found in notification recipients'
			});
		}

		if (!notification.recipients[recipientIndex].read) {
			notification.recipients[recipientIndex].read = true;
			notification.recipients[recipientIndex].readAt = new Date();
			notification.readCount += 1;
			await notification.save();
		}

		return res.json({
			success: true,
			message: 'Notification marked as read'
		});
	} catch (error) {
		console.error('Error marking notification as read:', error);
		return res.status(500).json({
			success: false,
			message: 'Internal Server Error'
		});
	}
});

// PATCH /api/notifications/mark-all-read - Mark all notifications as read for a user (mobile app)
router.patch('/mark-all-read', async (req, res) => {
	try {
		const { userId } = req.body;

		if (!userId) {
			return res.status(400).json({
				success: false,
				message: 'User ID is required'
			});
		}

		// Find all unread notifications for this user
		const notifications = await Notification.find({
			$or: [
				{ isBroadcast: true },
				{ userId: userId }
			],
			'recipients.userId': userId,
			'recipients.read': false
		});

		let updatedCount = 0;
		for (const notification of notifications) {
			const recipient = notification.recipients.find(
				r => r.userId.toString() === userId
			);
			if (recipient && !recipient.read) {
				recipient.read = true;
				recipient.readAt = new Date();
				notification.readCount += 1;
				await notification.save();
				updatedCount++;
			}
		}

		return res.json({
			success: true,
			message: `${updatedCount} notifications marked as read`
		});
	} catch (error) {
		console.error('Error marking all notifications as read:', error);
		return res.status(500).json({
			success: false,
			message: 'Internal Server Error'
		});
	}
});
