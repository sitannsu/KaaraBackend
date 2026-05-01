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
