/**
 * WhatsApp OTP delivery via msg2z.in WABA API
 *
 * Required env vars:
 *   WABA_API_KEY       – your API key from the msg2z.in panel
 *   WABA_PHONE_NUMBER_ID – your WABA sender phone-number ID (wabind)
 *
 * The approved template "loginotp" (ID 3166956) is an Authentication template
 * with a single body variable {{1}} that receives the OTP code.
 */

const WABA_BASE_URL = 'https://apibot.msg2z.in/v3';

/**
 * Send an OTP to a WhatsApp number via the approved "loginotp" template.
 *
 * @param {string} toPhone  – recipient in E.164 format, e.g. "919876543210"
 * @param {string} otp      – the 6-digit code to deliver
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export async function sendWhatsAppOtp(toPhone, otp) {
	const apiKey = process.env.WABA_API_KEY;
	const phoneNumberId = process.env.WABA_PHONE_NUMBER_ID;

	if (!apiKey || !phoneNumberId) {
		throw new Error('WABA_API_KEY and WABA_PHONE_NUMBER_ID must be set in environment');
	}

	// Normalise to E.164 without the "+" prefix (msg2z expects plain digits)
	const recipient = toPhone.replace(/^\+/, '').replace(/\s/g, '');

	const payload = {
		messaging_product: 'whatsapp',
		recipient_type: 'individual',
		to: recipient,
		type: 'template',
		template: {
			name: 'loginotp',
			language: { code: 'en' },
			components: [
				{
					type: 'body',
					parameters: [
						{ type: 'text', text: otp }
					]
				},
				// Authentication templates have a Copy Code / OTP button at index 0
				// that also requires the OTP value as a parameter
				{
					type: 'button',
					sub_type: 'url',
					index: '0',
					parameters: [
						{ type: 'text', text: otp }
					]
				}
			]
		}
	};

	const response = await fetch(`${WABA_BASE_URL}/${phoneNumberId}/messages`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			apikey: apiKey
		},
		body: JSON.stringify(payload)
	});

	const data = await response.json();

	if (!response.ok) {
		console.error('[WhatsApp OTP] API error:', data);
		return { success: false, error: data?.error?.message || 'WA API request failed' };
	}

	const messageId = data?.messages?.[0]?.id ?? null;
	console.log(`[WhatsApp OTP] Sent to ${recipient}, messageId=${messageId}`);
	return { success: true, messageId };
}
