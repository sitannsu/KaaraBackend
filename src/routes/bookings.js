import { Router } from 'express';
import { Booking } from '../models/Booking.js'
import { Hotel } from '../models/Hotel.js'
import mongoose from 'mongoose';

export const router = Router();

// Helper to resolve hotelId (slug or ObjectId) to actual ObjectId
async function resolveHotelId(hotelId) {
	if (!hotelId) return null;
	if (mongoose.Types.ObjectId.isValid(hotelId) && String(new mongoose.Types.ObjectId(hotelId)) === hotelId) {
		return hotelId; // Already valid ObjectId
	}
	// Try to find by slug
	const hotel = await Hotel.findOne({ slug: hotelId }).select('_id').lean();
	return hotel?._id || null;
}

// GET /api/bookings (admin)
router.get('/', async (req, res) => {
	const { hotelId, status, from, to, q } = req.query
	const filter = {}
	if (hotelId) filter.hotelId = hotelId
	if (status) filter.status = status
	if (from || to) filter.createdAt = { ...(from ? { $gte: new Date(from) } : {}), ...(to ? { $lte: new Date(to) } : {}) }
	if (q) filter.guestName = { $regex: q, $options: 'i' }
	const data = await Booking.find(filter).sort({ createdAt: -1 }).limit(500).lean()
	return res.json({ success: true, data })
});

// Create booking (from mobile) - minimal payload allowed
router.post('/', async (req, res, next) => {
	try {
		// Check MongoDB connection state
		const connectionState = mongoose.connection.readyState;
		if (connectionState !== 1) { // 1 = connected, 0 = disconnected, 2 = connecting, 3 = disconnecting
			return res.status(503).json({ 
				success: false, 
				message: 'Database not connected. Please check MongoDB connection.',
				connectionState: ['disconnected', 'connected', 'connecting', 'disconnecting'][connectionState]
			});
		}

		const payload = req.body || {}
		let resolvedHotelId = null;
		const originalHotelId = payload.hotelId;
		
		// Try to resolve hotelId with timeout (3 seconds)
		try {
			const resolvePromise = resolveHotelId(payload.hotelId);
			const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Hotel lookup timeout')), 3000));
			resolvedHotelId = await Promise.race([resolvePromise, timeoutPromise]);
		} catch (e) {
			// Hotel lookup failed or timed out - store slug instead
			console.warn('Hotel lookup failed/timed out:', e.message);
		}
		
		// Normalize
		const doc = {
			userId: payload.userId || null,
			hotelId: resolvedHotelId,
			hotelSlug: resolvedHotelId ? null : originalHotelId, // Store slug if lookup failed
			roomId: payload.roomId || null,
			from: payload.from ? new Date(payload.from) : new Date(),
			to: payload.to ? new Date(payload.to) : new Date(),
			total: Number(payload.total || 0),
			addOns: payload.addOns || [],
			paymentStatus: payload.paymentStatus || 'pending',
			status: payload.status || 'confirmed',
			guestName: payload.guestName || payload.name || 'Guest',
		}
		const created = await Booking.create(doc)
		return res.status(201).json({ success: true, data: created })
	} catch (e) {
		next(e)
	}
});

// user history
router.get('/:userId/history', async (req, res) => {
	const data = await Booking.find({ userId: req.params.userId }).sort({ createdAt: -1 }).lean()
	return res.json({ success: true, data })
});

// GET /api/bookings/:id
router.get('/:id', async (req, res) => {
	const data = await Booking.findById(req.params.id).lean()
	if (!data) return res.status(404).json({ success: false, message: 'Not found' })
	return res.json({ success: true, data })
});

// PUT /api/bookings/:id (modify)
router.put('/:id', async (req, res) => {
	const updates = req.body || {}
	const data = await Booking.findByIdAndUpdate(req.params.id, updates, { new: true })
	return res.json({ success: true, data })
});

// POST /api/bookings/:id/cancel
router.post('/:id/cancel', async (req, res) => {
	const data = await Booking.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { new: true })
	return res.json({ success: true, data })
});

// Export bookings
router.get('/export/file', async (req, res) => {
	return res.json({ success: true, data: { url: 's3://exports/bookings.csv' } });
});

// Approve helper retained for earlier admin UI
router.put('/:id/approve', async (req, res) => {
	const data = await Booking.findByIdAndUpdate(req.params.id, { status: 'confirmed' }, { new: true })
	return res.json({ success: true, data })
});
