// Central configuration for IPMS vendor integration
// Prefer using environment variables in production.
// This map allows per-hotel API keys when vendors issue keys per property.

export const IPMS_HOTEL_KEYS = {
	'43398': '29800837887e1b9e5b-0578-11f0-a',
}

export function getIpmsApiKey(hotelCode) {
	const code = String(hotelCode || '')
	if (code && IPMS_HOTEL_KEYS[code]) return IPMS_HOTEL_KEYS[code]
	if (process.env.IPMS_API_KEY) return process.env.IPMS_API_KEY
	return null
}


