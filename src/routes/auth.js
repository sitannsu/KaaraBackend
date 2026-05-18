import { Router } from 'express';
import { User } from '../models/User.js';
import { signJwt } from '../utils/jwt.js';
import { sendWhatsAppOtp } from '../services/whatsappService.js';
import { generateOtp, saveOtp, verifyOtp } from '../utils/otpStore.js';

export const router = Router();

// POST /auth/send-otp
router.post('/send-otp', async (req, res) => {
	const { phone } = req.body || {};
	if (!phone) return res.status(400).json({ success: false, message: 'phone required' });

	const otp = generateOtp();
	saveOtp(phone, otp);

	try {
		const result = await sendWhatsAppOtp(phone, otp);
		if (!result.success) {
			return res.status(502).json({ success: false, message: 'Failed to send OTP via WhatsApp', detail: result.error });
		}
	} catch (err) {
		console.error('[send-otp]', err);
		return res.status(500).json({ success: false, message: 'OTP delivery error' });
	}

	return res.json({ success: true, message: 'OTP sent via WhatsApp' });
});

// POST /auth/verify-otp
router.post('/verify-otp', async (req, res) => {
	const { phone, otp } = req.body || {};
	if (!phone || !otp) return res.status(400).json({ success: false, message: 'phone and otp required' });

	const result = verifyOtp(phone, otp);

	if (result === 'expired') {
		return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
	}
	if (result === 'max_attempts') {
		return res.status(429).json({ success: false, message: 'Too many wrong attempts. Please request a new OTP.' });
	}
	if (result === 'invalid') {
		return res.status(400).json({ success: false, message: 'Invalid OTP' });
	}

	// OTP is valid — look up user
	// Normalise to bare 10-digit number regardless of what prefix was sent
	const stripped = phone.replace(/\s/g, '').trim()
		.replace(/^\+91/, '')   // remove +91
		.replace(/^91(?=\d{10}$)/, ''); // remove leading 91 when followed by exactly 10 digits

	const user = await User.findOne({
		$or: [
			{ phone: stripped },
			{ phone: `91${stripped}` },
			{ phone: `+91${stripped}` },
			{ phone: phone.trim() }
		]
	});

	if (user) {
		user.lastLogin = new Date();
		await user.save();

		const token = signJwt({ userId: user._id, phone: user.phone });

		return res.json({
			success: true,
			token,
			user,
			isNewUser: false
		});
	}

	// New user — issue a short-lived registration token
	const regToken = signJwt({ phone: rawPhone, isRegistration: true }, '15m');

	return res.json({
		success: true,
		token: regToken,
		isNewUser: true
	});
});

// POST /auth/complete-profile
router.post('/complete-profile', async (req, res) => {
	const { phone, name, email, gender, dob } = req.body || {};
	if (!phone || !name || !email) {
		return res.status(400).json({ success: false, message: 'Missing fields' });
	}

	const rawPhone = phone.replace(/\s/g, '').trim()
		.replace(/^\+91/, '')
		.replace(/^91(?=\d{10}$)/, '');

	const user = await User.create({
		phone: rawPhone,
		name,
		email,
		gender,
		dob,
		lastLogin: new Date(),
		verified: true
	});

	const token = signJwt({ userId: user._id, phone: user.phone });

	return res.json({
		success: true,
		token,
		user
	});
});
