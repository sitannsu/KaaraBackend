import { Router } from 'express'
import { RateAdjustment } from '../models/RateAdjustment.js'
import { getIpmsApiKey, getIpmsHotelCode } from '../config/ipms.js'

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

function buildExternalInsertBookingUrl({ hotelCode, apiKey }) {
	const base = 'https://live.ipms247.com/booking/reservation_api/listing.php'
	const params = new URLSearchParams({
		request_type: 'InsertBooking',
		HotelCode: hotelCode,
		APIKey: apiKey,
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
		const hotelCode = getIpmsHotelCode(String(req.query.hotelCode || '').trim())
		const checkInDate = String(req.query.checkInDate || '').trim()
		const checkOutDate = String(req.query.checkOutDate || '').trim()
		const apiKey = String(req.query.apiKey || getIpmsApiKey(req.query.hotelCode) || '').trim()

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
		const hotelCode = getIpmsHotelCode(String(req.query.hotelCode || '').trim())
		const createdFrom = req.query.createdFrom ? String(req.query.createdFrom).trim() : undefined
		const createdTo = req.query.createdTo ? String(req.query.createdTo).trim() : undefined
		const apiKey = String(req.query.apiKey || getIpmsApiKey(req.query.hotelCode) || '').trim()

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
		const hotelCode = getIpmsHotelCode(String(req.query.hotelCode || '').trim())
		const apiKey = String(req.query.apiKey || getIpmsApiKey(req.query.hotelCode) || '').trim()
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
		const hotelCodeInternal = req.body?.hotelCode
		const hotelCode = getIpmsHotelCode(String(hotelCodeInternal || '').trim())
		const {
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

		const apiKey = String(req.query.apiKey || getIpmsApiKey(hotelCodeInternal) || '').trim()
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

		// Normalize payment mode: default 0 (Normal). Use 3 only when PG is enabled end-to-end.
		const rawMode = meta?.bookingPaymentMode
		let normalizedPaymentMode = Number(rawMode)
		if (Number.isNaN(normalizedPaymentMode)) normalizedPaymentMode = 0
		if (normalizedPaymentMode !== 0 && normalizedPaymentMode !== 3) normalizedPaymentMode = 0

		// Strict ID mapping per spec
		const mappedRateplanId = String(ids.Rateplan_Id ?? ids.roomrateunkid ?? '')
		const mappedRatetypeId = String(ids.Ratetype_Id ?? ids.ratetypeunkid ?? '')
		const mappedRoomtypeId = String(ids.Roomtype_Id ?? ids.roomtypeunkid ?? '')

		// Build room details
		const normalizedTitle = (() => {
			const t = String(guests.title ?? '').trim()
			if (!t) return 'Mr.'
			return t.endsWith('.') ? t : `${t}.`
		})()
		const normalizedGender = (() => {
			const g = String(guests.gender ?? '').trim()
			if (!g) return 'Male'
			return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase()
		})()
		const room1 = {
			Rateplan_Id: mappedRateplanId,
			Ratetype_Id: mappedRatetypeId,
			Roomtype_Id: mappedRoomtypeId,
			baserate: String(rates.baserate ?? ''),
			extradultrate: String(rates.extradultrate ?? ''),
			extrachildrate: String(rates.extrachildrate ?? ''),
			number_adults: String(guests.adults ?? 2),
			number_children: String(normalizedChildren),
			Title: normalizedTitle,
			First_Name: String(guests.firstName),
			Last_Name: String(guests.lastName),
			Gender: normalizedGender,
			Special_Request: String(guests.specialRequest ?? ''),
			// Always include ExtraChild_Age as vendor examples show it even for 0 children
			ExtraChild_Age: String(
				normalizedChildren > 0
					? (normalizedExtraChildAge === undefined || normalizedExtraChildAge === null || String(normalizedExtraChildAge) === '' ? 2 : normalizedExtraChildAge)
					: 0
			),
		}

		const bookingData = {
			Room_Details: {
				Room_1: room1,
			},
			check_in_date: String(checkInDate),
			check_out_date: String(checkOutDate),
			// Vendor expects "0" for normal flow, "3" for Payment Gateway
			Booking_Payment_Mode: String(normalizedPaymentMode),
			Email_Address: String(contact.email || ''),
			// Vendor expects key "source" (lowercase)
			source: String(meta.sourceId ?? 'KAARA-APP'),
			MobileNo: String(contact.mobile ?? ''),
			Address: String(contact.address ?? ''),
			State: String(contact.state ?? ''),
			Country: String(contact.country ?? ''),
			City: String(contact.city ?? ''),
			Zipcode: String(contact.zipcode ?? ''),
			Fax: String(contact.fax ?? ''),
			Device: String(meta.device ?? 'ANDROID') || 'ANDROID',
			Languagekey: String(meta.languagekey ?? 'en') || 'en',
			paymenttypeunkid: String(meta.paymenttypeunkid ?? ''),
		}

		const url = buildExternalInsertBookingUrl({ hotelCode, apiKey })
		// Print vendor URL (without BookingData in query)
		console.log('[insert-booking] vendorUrl', url.replace(apiKey, '***'))
		const formBody = new URLSearchParams()
		formBody.set('BookingData', JSON.stringify(bookingData))
		const resp = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: formBody.toString(),
		})
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
			const errCode = (errObj?.Error_Code || errObj?.ErrorCode || '').toString()
			const errMsg = (errObj?.ErrorMessage || errObj?.Error_Message || '').toString()

			// Retry once with swapped Rateplan_Id/Ratetype_Id mapping if ParametersMissing
			if ((errCode === 'ParametersMissing' || /Missing parameters/i.test(errMsg)) && !req.query?.noRetry) {
				const altRoom1 = {
					...bookingData.Room_Details.Room_1,
					Rateplan_Id: mappedRatetypeId,
					Ratetype_Id: mappedRateplanId,
				}
				const altBookingData = {
					...bookingData,
					Room_Details: { Room_1: altRoom1 },
				}
				const altUrl = buildExternalInsertBookingUrl({ hotelCode, apiKey })
				console.log('[insert-booking] retry with swapped ids', altUrl.replace(apiKey, '***'))
				const altForm = new URLSearchParams()
				altForm.set('BookingData', JSON.stringify(altBookingData))
				const altResp = await fetch(altUrl, {
					method: 'POST',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					body: altForm.toString(),
				})
				const altRaw = await altResp.json()
				console.log('[insert-booking] retry vendorResponse', altRaw)
				const altArrayError =
					Array.isArray(altRaw) &&
					altRaw.length > 0 &&
					altRaw[0] &&
					(typeof altRaw[0] === 'object') &&
					(altRaw[0]['Error Details'] || altRaw[0]['ErrorDetails'])
				if (!altRaw?.Errors && !altArrayError) {
					return res.json({ success: true, data: altRaw, debug: req.query.debug ? { vendorUrl: altUrl, sent: altBookingData } : undefined })
				}
				// Fallthrough to return the original error, include alt attempt in debug
				return res.status(400).json({
					success: false,
					message: errMsg || errCode || 'External API error',
					data: raw,
					sent: bookingData,
					debug: { vendorUrl: url, altVendorUrl: altUrl, altSent: altBookingData },
				})
			}

			return res.status(400).json({
				success: false,
				message: errMsg || errCode || 'External API error',
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


