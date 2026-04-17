import { Router } from 'express';

export const router = Router();

// In-memory request store for demo (or just fully stateless with 1234)
const users = [
	{
		id: 'u_demo',
		phone: '1234567890',
		name: 'Rohan Sharma',
		email: 'rohan.sharma@email.com',
		membership: 'Gold Member',
		avatarUrl: 'https://i.pravatar.cc/150?img=12',
		savedIdStatus: 'verified',
		loyaltyPoints: 1240,
		tierProgress: 24,
		nextTier: 'Platinum',
		newCouponsCount: 2
	}
];

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

	// Check if user exists (mock check)
	// In a real app, query the User model: const user = await User.findOne({ phone });
	// For demo: treat the specific demo phone as existing, others as new
	let user = users.find(u => u.phone === phone || u.phone === `+91${phone}` || u.phone === phone.replace('+91', ''));

	// Normalize phone for comparison
	const rawPhone = phone.replace('+91', '').trim();
	if (rawPhone === '1234567890') {
		user = users[0];
	}

	if (user) {
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
	const { phone, name, email } = req.body || {};
	if (!phone || !name || !email) {
		return res.status(400).json({ success: false, message: 'Missing fields' });
	}

	// Create new user (mock)
	const newUser = {
		id: `u_${Date.now()}`,
		phone,
		name,
		email,
		membership: 'Silver Member', // Default
		savedIdStatus: 'pending',
		loyaltyPoints: 0,
		tierProgress: 0,
		nextTier: 'Gold',
		newCouponsCount: 0,
		createdAt: new Date().toISOString()
	};

	users.push(newUser); // In-memory persistence only works if process doesn't restart

	return res.json({
		success: true,
		token: 'dummy.jwt.token',
		user: newUser
	});
});
