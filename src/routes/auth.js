import { Router } from 'express';
import { User } from '../models/User.js';

export const router = Router();

router.post('/send-otp', async (req, res) => {
	const { phone } = req.body || {};
	if (!phone) return res.status(400).json({ success: false, message: 'phone required' });

	// In production, trigger SMS here.
	console.log(`OTP sent to ${phone}: 1234`);

	return res.json({ success: true, message: 'OTP sent' });
});

router.post('/verify-otp', async (req, res) => {
	const { phone, otp } = req.body || {};
	if (!phone || !otp) return res.status(400).json({ success: false, message: 'phone and otp required' });

	if (otp !== '1234') {
		return res.status(400).json({ success: false, message: 'Invalid OTP' });
	}

	// Normalize phone for comparison
	const rawPhone = phone.replace('+91', '').replace(/\s/g, '').trim();
	
	// Check if user exists in DB
	const user = await User.findOne({ 
		$or: [
			{ phone: rawPhone },
			{ phone: `+91${rawPhone}` },
			{ phone: phone.trim() }
		]
	});

	if (user) {
		// Update last login time
		user.lastLogin = new Date();
		await user.save();

		return res.json({
			success: true,
			token: 'dummy.jwt.token',
			user,
			isNewUser: false
		});
	}

	// New user flow
	return res.json({
		success: true,
		token: 'temp.registration.token',
		isNewUser: true
	});
});

router.post('/complete-profile', async (req, res) => {
	const { phone, name, email, gender, dob } = req.body || {};
	if (!phone || !name || !email) {
		return res.status(400).json({ success: false, message: 'Missing fields' });
	}

	const rawPhone = phone.replace('+91', '').replace(/\s/g, '').trim();

	// Create new user in DB
	const user = await User.create({
		phone: rawPhone,
		name,
		email,
		gender,
		dob,
		lastLogin: new Date(),
		verified: true
	});

	return res.json({
		success: true,
		token: 'dummy.jwt.token',
		user
	});
});
