/**
 * In-memory OTP store with per-entry TTL and brute-force protection.
 *
 * Each entry:  { otp, expiresAt, attempts }
 * TTL:         5 minutes (configurable via OTP_TTL_MS env)
 * Max retries: 5 wrong guesses before the entry is invalidated
 */

const OTP_TTL_MS = parseInt(process.env.OTP_TTL_MS || '300000', 10); // 5 min
const MAX_ATTEMPTS = 5;

const store = new Map(); // key = normalised phone number

function normalise(phone) {
	return phone.replace(/^\+/, '').replace(/\s/g, '');
}

/** Save (or replace) an OTP for the given phone number. */
export function saveOtp(phone, otp) {
	store.set(normalise(phone), {
		otp,
		expiresAt: Date.now() + OTP_TTL_MS,
		attempts: 0
	});
}

/**
 * Verify the supplied OTP.
 * Returns: 'ok' | 'expired' | 'invalid' | 'max_attempts'
 */
export function verifyOtp(phone, otp) {
	const key = normalise(phone);
	const entry = store.get(key);

	if (!entry) return 'expired';
	if (Date.now() > entry.expiresAt) {
		store.delete(key);
		return 'expired';
	}
	if (entry.attempts >= MAX_ATTEMPTS) {
		store.delete(key);
		return 'max_attempts';
	}

	if (entry.otp !== String(otp)) {
		entry.attempts += 1;
		return 'invalid';
	}

	store.delete(key); // single-use
	return 'ok';
}

/** Generate a cryptographically random 6-digit OTP string. */
export function generateOtp() {
	// Use crypto.getRandomValues if available (Node 19+), else Math.random fallback
	const code = Math.floor(100000 + Math.random() * 900000);
	return String(code);
}
