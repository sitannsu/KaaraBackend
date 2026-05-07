import { Router } from 'express';
import { User } from '../models/User.js';

export const router = Router();

// GET /api/users - List all users
router.get('/', async (req, res) => {
	try {
		const users = await User.find({}).sort({ createdAt: -1 });
		return res.json({ success: true, data: users });
	} catch (error) {
		console.error('Error fetching users:', error);
		return res.status(500).json({ success: false, message: 'Internal Server Error' });
	}
});

// GET /api/users/:id - Get single user
router.get('/:id', async (req, res) => {
	try {
		const user = await User.findById(req.params.id);
		if (!user) {
			return res.status(404).json({ success: false, message: 'User not found' });
		}
		return res.json({ success: true, data: user });
	} catch (error) {
		console.error('Error fetching user:', error);
		return res.status(500).json({ success: false, message: 'Internal Server Error' });
	}
});

// POST /api/users/:id/fcm-token - Update FCM token for push notifications
router.post('/:id/fcm-token', async (req, res) => {
	try {
		const { fcmToken } = req.body;

		if (!fcmToken) {
			return res.status(400).json({ success: false, message: 'FCM token is required' });
		}

		const user = await User.findByIdAndUpdate(
			req.params.id,
			{
				fcmToken,
				fcmTokenUpdatedAt: new Date()
			},
			{ new: true }
		);

		if (!user) {
			return res.status(404).json({ success: false, message: 'User not found' });
		}

		return res.json({
			success: true,
			message: 'FCM token updated successfully'
		});
	} catch (error) {
		console.error('Error updating FCM token:', error);
		return res.status(500).json({ success: false, message: 'Internal Server Error' });
	}
});
