import { Router } from 'express';
import crypto from 'crypto';

export const router = Router();

// POST /payment/razorpay/order
// Body: { amount: number (in INR), currency?: 'INR', receipt?: string, notes?: object }
router.post('/razorpay/order', async (req, res) => {
	try {
		const keyId = process.env.RAZORPAY_KEY_ID;
		const keySecret = process.env.RAZORPAY_KEY_SECRET;
		if (!keyId || !keySecret) {
			return res.status(500).json({ success: false, message: 'Razorpay keys not configured' });
		}
		const amountInRupees = Number(req.body?.amount || 0);
		if (!amountInRupees || amountInRupees <= 0) {
			return res.status(400).json({ success: false, message: 'Invalid amount' });
		}
		const currency = req.body?.currency || 'INR';
		const amountPaise = Math.round(amountInRupees * 100);
		const payload = {
			amount: amountPaise,
			currency,
			receipt: req.body?.receipt || `rcpt_${Date.now()}`,
			notes: req.body?.notes || {},
		};
		const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
		const resp = await fetch('https://api.razorpay.com/v1/orders', {
			method: 'POST',
			headers: {
				Authorization: `Basic ${auth}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		});
		const data = await resp.json();
		if (!resp.ok) {
			return res.status(resp.status).json({ success: false, message: data?.error?.description || 'Failed to create order', details: data });
		}
		return res.json({ success: true, order: data, keyId });
	} catch (e) {
		return res.status(500).json({ success: false, message: e?.message || 'Order creation failed' });
	}
});

// POST /payment/razorpay/verify
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
router.post('/razorpay/verify', async (req, res) => {
	try {
		const keySecret = process.env.RAZORPAY_KEY_SECRET;
		if (!keySecret) {
			return res.status(500).json({ success: false, message: 'Razorpay secret not configured' });
		}
		const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
		if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
			return res.status(400).json({ success: false, message: 'Missing verification params' });
		}
		const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
		const expected = crypto.createHmac('sha256', keySecret).update(payload).digest('hex');
		const valid = expected === razorpay_signature;
		return res.json({ success: valid, valid, expected, signature: razorpay_signature });
	} catch (e) {
		return res.status(500).json({ success: false, message: e?.message || 'Verification failed' });
	}
});

// Razorpay webhook placeholder
router.post('/webhook', async (req, res) => {
	return res.json({ success: true });
});
