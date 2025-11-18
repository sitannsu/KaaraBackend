import { Router } from 'express'
import { RateAdjustment } from '../models/RateAdjustment.js'
import { getIpmsApiKey } from '../config/ipms.js'

export const router = Router()

function buildExternalUrl({ hotelCode, apiKey, checkInDate, checkOutDate }) {
	const base = 'https://live.ipms247.com/booking/reservation_api/listing.php'
	const params = new URLSearchParams({
		request_type: 'RoomList',
		HotelCode: hotelCode,
		APIKey: apiKey,
		check_in_date: checkInDate,
		check_out_date: checkOutDate,
	})
	return `${base}?${params.toString()}`
}

function buildExternalBookingUrl({ hotelCode, apiKey, createdFrom, createdTo }) {
	const base = 'https://live.ipms247.com/booking/reservation_api/listing.php'
	const params = new URLSearchParams({
		request_type: 'BookingList',
		HotelCode: hotelCode,
		APIKey: apiKey,
	})
	// Some installations may support created_from/created_to; pass through if provided
	if (createdFrom) params.set('created_from', createdFrom)
	if (createdTo) params.set('created_to', createdTo)
	return `${base}?${params.toString()}`
}

function buildExternalRoomTypesUrl({ hotelCode, apiKey }) {
	const base = 'https://live.ipms247.com/booking/reservation_api/listing.php'
	const params = new URLSearchParams({
		request_type: 'RoomTypeList',
		HotelCode: hotelCode,
		APIKey: apiKey,
		language: 'en',
		publishtoweb: '1',
	})
	return `${base}?${params.toString()}`
}

function buildExternalInsertBookingUrl({ hotelCode, apiKey, bookingData }) {
	const base = 'https://live.ipms247.com/booking/reservation_api/listing.php'
	const params = new URLSearchParams({
		request_type: 'InsertBooking',
		HotelCode: hotelCode,
		APIKey: apiKey,
		// BookingData must be JSON string; keep keys/case as vendor expects
		BookingData: JSON.stringify(bookingData),
	})
	return `${base}?${params.toString()}`
}

function firstNumberFromDateMap(mapLike) {
	if (!mapLike || typeof mapLike !== 'object') return undefined
	const val = Object.values(mapLike)[0]
	if (val == null) return undefined
	const n = Number(val)
	return Number.isNaN(n) ? undefined : n
}

function parseBaseRate(room) {
	const avg = Number(room?.room_rates_info?.avg_per_night_without_tax)
	if (!Number.isNaN(avg) && avg > 0) return Math.round(avg)
	// fallback: take first exclusive_tax value
	const exclusive = room?.room_rates_info?.exclusive_tax
	if (exclusive && typeof exclusive === 'object') {
		const first = Number(Object.values(exclusive)[0])
		if (!Number.isNaN(first)) return Math.round(first)
	}
	return 0
}

function applyDiscountToRate(baseRate, discount) {
	if (!discount) return baseRate
	const { type, value } = discount
	if (type === 'percentage') {
		return Math.max(0, Math.round(baseRate * (1 - value / 100)))
	}
	return Math.max(0, Math.round(baseRate - value))
}

router.get('/', async (req, res) => {
	try {
		const hotelCode = String(req.query.hotelCode || '').trim()
		const checkInDate = String(req.query.checkInDate || '').trim()
		const checkOutDate = String(req.query.checkOutDate || '').trim()
			const apiKey = String(req.query.apiKey || getIpmsApiKey(hotelCode) || '').trim()

		if (!hotelCode || !checkInDate || !checkOutDate) {
			return res.status(400).json({ success: false, message: 'Missing required params' })
		}
		if (!apiKey) {
			return res
				.status(400)
				.json({ success: false, message: 'Missing API key. Set IPMS_API_KEY or pass apiKey param.' })
		}

		const url = buildExternalUrl({ hotelCode, apiKey, checkInDate, checkOutDate })
		const resp = await fetch(url, { method: 'GET' })
		const raw = await resp.json()

		// Error shape: { Errors: { ErrorCode, ErrorMessage } }
		if (raw?.Errors) {
			return res.status(400).json({ success: false, message: raw.Errors.ErrorMessage || 'External API error' })
		}

		const roomsArray = Array.isArray(raw) ? raw : []

		// Fetch saved discounts for this hotel
		const adjustments = await RateAdjustment.find({ hotelCode }).lean()
		const keyToDiscount = new Map(
			(adjustments || []).map((a) => [`${a.hotelCode}:${a.roomtypeunkid}`, a.discount])
		)

		const data = roomsArray.map((r) => {
			const base_rate = parseBaseRate(r)
			const discount = keyToDiscount.get(`${hotelCode}:${r.roomtypeunkid}`) || null
			const effective_rate = applyDiscountToRate(base_rate, discount)
			return {
				...r,
				base_rate,
				discount,
				effective_rate,
			}
		})

		return res.json({ success: true, data })
	} catch (err) {
		console.error('liveRates GET error', err)
		return res.status(500).json({ success: false, message: 'Failed to fetch live rates' })
	}
})

// GET /live-rates/bookings?hotelCode=...&createdFrom=YYYY-MM-DD&createdTo=YYYY-MM-DD
router.get('/bookings', async (req, res) => {
	try {
		const hotelCode = String(req.query.hotelCode || '').trim()
		const createdFrom = req.query.createdFrom ? String(req.query.createdFrom).trim() : undefined
		const createdTo = req.query.createdTo ? String(req.query.createdTo).trim() : undefined
		const apiKey = String(req.query.apiKey || getIpmsApiKey(hotelCode) || '').trim()

		if (!hotelCode) return res.status(400).json({ success: false, message: 'Missing hotelCode' })
		if (!apiKey) {
			return res
				.status(400)
				.json({ success: false, message: 'Missing API key. Set IPMS_API_KEY or per-hotel key.' })
		}

		const url = buildExternalBookingUrl({ hotelCode, apiKey, createdFrom, createdTo })
		const resp = await fetch(url, { method: 'GET' })
		const raw = await resp.json()
		if (raw?.Errors) {
			return res.status(400).json({ success: false, message: raw.Errors.ErrorMessage || 'External API error' })
		}
		// Normalize to an array
		const list = Array.isArray(raw?.BookingList) ? raw.BookingList : raw?.BookingList?.length ? raw.BookingList : raw?.BookingList || []
		return res.json({ success: true, data: list, meta: raw?.SearchCriteria || null, roomStats: raw?.RoomList || null })
	} catch (err) {
		console.error('liveRates bookings error', err)
		return res.status(500).json({ success: false, message: 'Failed to fetch bookings' })
	}
})

// GET /live-rates/room-types?hotelCode=...
router.get('/room-types', async (req, res) => {
	try {
		const hotelCode = String(req.query.hotelCode || '').trim()
		const apiKey = String(req.query.apiKey || getIpmsApiKey(hotelCode) || '').trim()
		if (!hotelCode) return res.status(400).json({ success: false, message: 'Missing hotelCode' })
		if (!apiKey) {
			return res
				.status(400)
				.json({ success: false, message: 'Missing API key. Set IPMS_API_KEY or per-hotel key.' })
		}
		const url = buildExternalRoomTypesUrl({ hotelCode, apiKey })
		const resp = await fetch(url, { method: 'GET' })
		const raw = await resp.json()
		if (raw?.Errors) {
			return res.status(400).json({ success: false, message: raw.Errors.ErrorMessage || 'External API error' })
		}
		const list = Array.isArray(raw) ? raw : raw?.RoomTypeList || raw?.data || []
		return res.json({ success: true, data: list })
	} catch (err) {
		console.error('liveRates room-types error', err)
		return res.status(500).json({ success: false, message: 'Failed to fetch room types' })
	}
})

// POST /live-rates/insert-booking
// Body: {
//   hotelCode, checkInDate, checkOutDate,
//   ids: { Rateplan_Id, Ratetype_Id, Roomtype_Id },
//   rates?: { baserate, extradultrate, extrachildrate },
//   guests: { adults, children, extraChildAge?, title?, firstName, lastName, gender?, specialRequest? },
//   contact: { email, mobile?, address?, state?, country?, city?, zipcode?, fax? },
//   meta?: { sourceId?, device?, languagekey?, paymenttypeunkid? }
// }
router.post('/insert-booking', async (req, res) => {
	try {
		const {
			hotelCode,
			checkInDate,
			checkOutDate,
			ids,
			rates = {},
			guests,
			contact = {},
			meta = {},
		} = req.body || {}

		if (!hotelCode || !checkInDate || !checkOutDate) {
			return res.status(400).json({ success: false, message: 'Missing hotelCode/checkInDate/checkOutDate' })
		}
		if (!ids?.Rateplan_Id || !ids?.Ratetype_Id || !ids?.Roomtype_Id) {
			return res.status(400).json({ success: false, message: 'Missing required room/plan identifiers' })
		}
		if (!guests?.firstName || !guests?.lastName || !contact?.email) {
			return res.status(400).json({ success: false, message: 'Missing guest name or email' })
		}
		// If children > 0 and no ExtraChild_Age provided, vendor rejects with ParametersMissing.
		// Either enforce presence or provide a safe default (2).
		const normalizedChildren = Number(guests.children || 0)
		let normalizedExtraChildAge = guests?.extraChildAge
		if (normalizedChildren > 0 && (normalizedExtraChildAge === undefined || normalizedExtraChildAge === null || normalizedExtraChildAge === '')) {
			// Fallback to "2" years if not provided
			normalizedExtraChildAge = 2
		}

		const apiKey = String(req.query.apiKey || getIpmsApiKey(hotelCode) || '').trim()
		if (!apiKey) return res.status(400).json({ success: false, message: 'Missing API key' })

		// Log incoming request details (excluding secrets in body; apiKey only in URL param)
		console.log('[insert-booking] request', {
			method: req.method,
			query: { ...req.query, apiKey: req.query.apiKey ? '***' : undefined },
			body: {
				hotelCode,
				checkInDate,
				checkOutDate,
				ids,
				rates,
				guests,
				contact,
				meta,
			},
		})

		const bookingData = {
			Room_Details: {
				Room_1: {
					// Map to vendor schema: Rateplan_Id corresponds to rate plan (ratetypeunkid in RoomList),
					// Ratetype_Id corresponds to room rate id (roomrateunkid in RoomList)
					Rateplan_Id: String(ids.Rateplan_Id || ids.Ratetype_Id || ids.ratetypeunkid || ''),
					Ratetype_Id: String(ids.Ratetype_Id || ids.Rateplan_Id || ids.roomrateunkid || ''),
					Roomtype_Id: String(ids.Roomtype_Id),
					baserate: String(rates.baserate ?? ''),
					extradultrate: String(rates.extradultrate ?? ''),
					extrachildrate: String(rates.extrachildrate ?? ''),
					number_adults: String(guests.adults ?? 2),
					number_children: String(normalizedChildren),
					ExtraChild_Age: String(normalizedExtraChildAge ?? ''),
					Title: String(guests.title ?? ''),
					First_Name: String(guests.firstName),
					Last_Name: String(guests.lastName),
					Gender: String(guests.gender ?? ''),
					SpecialRequest: String(guests.specialRequest ?? ''),
				},
			},
			check_in_date: String(checkInDate),
			check_out_date: String(checkOutDate),
			// Some accounts require specific codes; by default keep empty (matches vendor examples)
			Booking_Payment_Mode: String(meta.bookingPaymentMode ?? ''),
			Email_Address: String(contact.email || ''),
			Source_Id: String(meta.sourceId ?? 'KAARA-APP'),
			MobileNo: String(contact.mobile ?? ''),
			Address: String(contact.address ?? ''),
			State: String(contact.state ?? ''),
			Country: String(contact.country ?? ''),
			City: String(contact.city ?? ''),
			Zipcode: String(contact.zipcode ?? ''),
			Fax: String(contact.fax ?? ''),
			Device: String(meta.device ?? ''),
			Languagekey: String(meta.languagekey ?? ''),
			paymenttypeunkid: String(meta.paymenttypeunkid ?? ''),
		}

		const url = buildExternalInsertBookingUrl({ hotelCode, apiKey, bookingData })
		// Print fully resolved vendor URL (with API key masked for logs)
		console.log('[insert-booking] vendorUrl', url.replace(apiKey, '***'))
		const resp = await fetch(encodeURI(url), { method: 'GET' })
		const raw = await resp.json()
		console.log('[insert-booking] vendorResponse', raw)
		// Normalize vendor error shape: can be { Errors: {...} } or [ { 'Error Details': {...} } ]
		const arrayError =
			Array.isArray(raw) &&
			raw.length > 0 &&
			raw[0] &&
			(typeof raw[0] === 'object') &&
			(raw[0]['Error Details'] || raw[0]['ErrorDetails'])
		if (raw?.Errors || arrayError) {
			const errObj = raw?.Errors || arrayError
			return res.status(400).json({
				success: false,
				message:
					(errObj?.ErrorMessage ||
						errObj?.Error_Message ||
						errObj?.Error_Code ||
						'External API error'),
				data: raw,
				sent: bookingData,
				debug: { vendorUrl: url },
			})
		}
		return res.json({ success: true, data: raw, debug: req.query.debug ? { vendorUrl: url, sent: bookingData } : undefined })
	} catch (err) {
		console.error('liveRates insert-booking error', err)
		return res.status(500).json({ success: false, message: 'Failed to create booking' })
	}
})

// Help handler for accidental GET usage
router.get('/insert-booking', (req, res) => {
	return res
		.status(405)
		.json({
			success: false,
			message: 'Use POST /api/live-rates/insert-booking with JSON body. Add ?debug=true to receive vendorUrl.',
		})
})

router.post('/discount', async (req, res) => {
	try {
		const { hotelCode, roomtypeunkid, discount } = req.body || {}
		if (!hotelCode || !roomtypeunkid || !discount || typeof discount.value !== 'number' || !discount.type) {
			return res.status(400).json({ success: false, message: 'Invalid payload' })
		}

		const updated = await RateAdjustment.findOneAndUpdate(
			{ hotelCode, roomtypeunkid },
			{ hotelCode, roomtypeunkid, discount },
			{ new: true, upsert: true, setDefaultsOnInsert: true }
		).lean()

		return res.json({ success: true, data: updated })
	} catch (err) {
		console.error('liveRates POST discount error', err)
		return res.status(500).json({ success: false, message: 'Failed to save discount' })
	}
})


