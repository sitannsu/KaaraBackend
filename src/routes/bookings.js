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
		
		// Prepare external IPMS InsertBooking call
		const HOTEL_CODE = process.env.IPMS_HOTEL_CODE || '43398';
		const API_KEY = process.env.IPMS_API_KEY || '29800837887e1b9e5b-0578-11f0-a';
		const hardcodedEmail = 'test@test.com';

		// If the frontend sent a ready payload, use it; else construct a minimal one
		const ipmsPayload = (() => {
			if (payload.ipmsInsertPayload && typeof payload.ipmsInsertPayload === 'object') {
				// Force email override irrespective of what the client sent
				return {
					...payload.ipmsInsertPayload,
					Email_Address: hardcodedEmail,
				};
			}
			// Fallback minimal mapper
			const firstName = (payload.guestName || 'Guest').split(' ')[0] || 'Guest';
			const lastName = (payload.guestName || 'User').split(' ').slice(1).join(' ') || 'User';
			return {
				Room_Details: {
					Room_1: {
						Rateplan_Id: '800000000000022',
						Ratetype_Id: '800000000000007',
						Roomtype_Id: '800000000000001',
						baserate: String(payload.total || 500),
						extradultrate: '0',
						extrachildrate: '0',
						number_adults: '2',
						number_children: '1',
						ExtraChild_Age: '2',
						Title: '',
						First_Name: firstName,
						Last_Name: lastName,
						Gender: '',
						SpecialRequest: '',
					}
				},
				check_in_date: (payload.from || new Date()).toString().slice(0, 10),
				check_out_date: (payload.to || new Date()).toString().slice(0, 10),
				Booking_Payment_Mode: '',
				Email_Address: hardcodedEmail,
				Source_Id: '',
				MobileNo: '',
				Address: '',
				State: '',
				Country: '',
				City: '',
				Zipcode: '',
				Fax: '',
				Device: '',
				Languagekey: '',
				paymenttypeunkid: '',
			};
		})();

		let ipmsResponse = null;
		try {
			const bookingDataParam = encodeURIComponent(JSON.stringify(ipmsPayload));
			const url = `https://live.ipms247.com/booking/reservation_api/listing.php?request_type=InsertBooking&HotelCode=${encodeURIComponent(HOTEL_CODE)}&APIKey=${encodeURIComponent(API_KEY)}&BookingData=${bookingDataParam}`;
			const resp = await fetch(url);
			const txt = await resp.text();
			// IPMS might return JSON or plain text; try to parse JSON
			try {
				ipmsResponse = JSON.parse(txt);
			} catch {
				ipmsResponse = { raw: txt };
			}
		} catch (err) {
			console.error('IPMS InsertBooking call failed:', err);
			ipmsResponse = { error: true, message: err?.message || 'InsertBooking call failed' };
		}

		// Normalize and save in Mongo
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
			email: hardcodedEmail,
			externalProvider: 'ipms247',
			externalReservationId: ipmsResponse?.Reservation_Id || ipmsResponse?.reservation_id || null,
			externalPayload: ipmsPayload,
			externalResponse: ipmsResponse,
		}
		const created = await Booking.create(doc)
		return res.status(201).json({ success: true, data: created })
	} catch (e) {
		next(e)
	}
});

// user history - GET /api/bookings/:userId/history
router.get('/:userId/history', async (req, res) => {
	try {
		const { userId } = req.params;
		
		// Build filter - if userId is 'all' or null, return all bookings (for admin/testing)
		const filter = {};
		if (userId && userId !== 'all' && userId !== 'null') {
			// Check if userId is a valid ObjectId
			if (mongoose.Types.ObjectId.isValid(userId)) {
				filter.userId = userId;
			} else {
				// If not a valid ObjectId, try to find by guestName or email as fallback
				// This allows querying by guest name for testing
				filter.$or = [
					{ guestName: { $regex: userId, $options: 'i' } },
					{ email: { $regex: userId, $options: 'i' } }
				];
			}
		}
		
		// Fetch bookings with optional hotel population
		const bookings = await Booking.find(filter)
			.sort({ createdAt: -1 })
			.limit(100) // Limit to prevent large responses
			.lean();
		
		// Optionally populate hotel information if hotelId exists
		const bookingsWithHotel = await Promise.all(
			bookings.map(async (booking) => {
				if (booking.hotelId && mongoose.Types.ObjectId.isValid(booking.hotelId)) {
					try {
						const hotel = await Hotel.findById(booking.hotelId)
							.select('name slug address city state country images')
							.lean();
						return {
							...booking,
							hotel: hotel || null,
						};
					} catch (err) {
						console.warn('Hotel lookup failed for booking:', booking._id, err.message);
						return booking;
					}
				}
				return booking;
			})
		);
		
		return res.json({ 
			success: true, 
			data: bookingsWithHotel,
			count: bookingsWithHotel.length 
		});
	} catch (error) {
		console.error('User booking history error:', error);
		return res.status(500).json({ 
			success: false, 
			message: 'Failed to fetch booking history',
			error: error.message 
		});
	}
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
