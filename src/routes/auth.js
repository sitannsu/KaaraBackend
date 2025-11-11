import { Router } from 'express';

export const router = Router();

router.post('/send-otp', async (req, res) => {
	// Placeholder: integrate Twilio/Firebase here
	const { phone } = req.body || {};
	if (!phone) return res.status(400).json({ success: false, message: 'phone required' });
	return res.json({ success: true, message: 'OTP sent' });
});

router.post('/verify-otp', async (req, res) => {
	const { phone, otp } = req.body || {};
	if (!phone || !otp) return res.status(400).json({ success: false, message: 'phone and otp required' });
	// Issue fake JWT for now
	return res.json({ success: true, token: 'dummy.jwt.token', user: { id: 'u_demo', phone } });
});
