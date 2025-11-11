import { Router } from 'express';

export const router = Router();

router.post('/initiate', async (req, res) => {
	return res.json({ success: true, orderId: 'rzp_order_demo', amount: req.body?.amount || 0 });
});

router.post('/verify', async (req, res) => {
	return res.json({ success: true, status: 'verified' });
});

// Razorpay webhook placeholder
router.post('/webhook', async (req, res) => {
	return res.json({ success: true });
});
