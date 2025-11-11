import { Router } from 'express';

export const router = Router();

router.get('/bookings', async (req, res) => {
	const data = [
		{ id: 'b1', hotel: 'Kaara Bali', guest: 'Emily R.', date: '2024-09-17 → 2024-09-20', status: 'pending', amount: 2450 },
		{ id: 'b2', hotel: 'Kaara New York', guest: 'John A.', date: '2024-10-24 → 2024-10-28', status: 'confirmed', amount: 1850 },
	]
	return res.json({ success: true, data });
});

router.get('/summary', async (req, res) => {
	return res.json({ success: true, data: { revenue: 0, occupancy: 0, cancellations: 0 } });
});
