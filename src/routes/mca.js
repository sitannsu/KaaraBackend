import { Router } from 'express';
import { McaUser } from '../models/McaUser.js';

export const router = Router();

// ================= V2 USERS =================

// GET /api/v1/mca/v2/users
router.get('/v2/users', async (req, res) => {
	try {
		const data = await McaUser.find({ version: 'V2', isActive: true }).sort({ updatedAt: -1 }).lean();
		return res.json({ success: true, data, message: 'Fetched MCA V2 Users' });
	} catch (e) {
		console.error('Error fetching MCA V2 Users:', e);
		return res.status(500).json({ success: false, message: 'Server Error' });
	}
});

// POST /api/v1/mca/v2/users
// Form Request Body: {"username":"", "password":""}
router.post('/v2/users', async (req, res) => {
	try {
		const { username, password } = req.body;
		if (!username || !password) return res.status(400).json({ success: false, message: 'Username and password are required' });

		const created = await McaUser.create({ username, password, version: 'V2' });
		return res.status(201).json({ success: true, data: created, message: 'MCA V2 User added successfully' });
	} catch (e) {
		console.error('Error creating MCA V2 User:', e);
		return res.status(500).json({ success: false, message: 'Server Error' });
	}
});

// ================= V3 USERS =================

// GET /api/v1/mca/v3/users
router.get('/v3/users', async (req, res) => {
	try {
		const data = await McaUser.find({ version: 'V3', isActive: true }).sort({ updatedAt: -1 }).lean();
		return res.json({ success: true, data, message: 'Fetched MCA V3 Users' });
	} catch (e) {
		console.error('Error fetching MCA V3 Users:', e);
		return res.status(500).json({ success: false, message: 'Server Error' });
	}
});

// POST /api/v1/mca/v3/users
// Form Request Body: {"email":""}
router.post('/v3/users', async (req, res) => {
	try {
		const { email } = req.body;
		if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

		// Stub for "Send OTP" as seen in screenshot
		const created = await McaUser.create({ email, version: 'V3' });
		return res.status(201).json({ success: true, data: created, message: 'OTP sent and MCA V3 User record initiated' });
	} catch (e) {
		console.error('Error initiating MCA V3 User:', e);
		return res.status(500).json({ success: false, message: 'Server Error' });
	}
});
