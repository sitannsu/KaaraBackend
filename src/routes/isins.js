import { Router } from 'express';
import { Isin } from '../models/Isin.js';

export const router = Router();

// GET /api/v1/isin?search=&page=1&limit=10
router.get('/', async (req, res) => {
	try {
		const { search, page = 1, limit = 10 } = req.query;
		const query = { isActive: true };

		if (search) {
			query.$or = [
				{ cin: { $regex: search, $options: 'i' } },
				{ securityName: { $regex: search, $options: 'i' } }
			];
		}

		const skip = (parseInt(page) - 1) * parseInt(limit);
		const data = await Isin.find(query)
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(parseInt(limit))
			.lean();

		const total = await Isin.countDocuments(query);

		return res.json({
			success: true,
			data,
			pagination: { total, page: parseInt(page), limit: parseInt(limit) },
			message: 'Successfully fetched ISIN applications'
		});
	} catch (e) {
		console.error('Error fetching ISINs:', e);
		return res.status(500).json({ success: false, message: 'Server Error' });
	}
});

// POST /api/v1/isin
router.post('/', async (req, res) => {
	try {
		const payload = req.body || {};
		const created = await Isin.create(payload);
		return res.status(201).json({ success: true, data: created, message: 'Successfully initiated ISIN creation' });
	} catch (e) {
		console.error('Error creating ISIN:', e);
		return res.status(400).json({ success: false, message: e.message || 'Validation failed' });
	}
});

// POST /api/v1/isin/resolution
// Usually expects an isinId in the body to identify which application to update
router.post('/resolution', async (req, res) => {
	try {
		const { isinId, meetingDate, authorizedSignatories, approvalMode, meetingTime } = req.body;
		if (!isinId) return res.status(400).json({ success: false, message: 'isinId is required' });

		const updated = await Isin.findByIdAndUpdate(isinId, {
			meetingDate,
			authorizedSignatories,
			approvalMode,
			meetingTime
		}, { new: true });

		if (!updated) return res.status(404).json({ success: false, message: 'ISIN application not found' });
		return res.json({ success: true, data: updated, message: 'Resolution details updated successfully' });
	} catch (e) {
		console.error('Error updating ISIN resolution:', e);
		return res.status(500).json({ success: false, message: 'Server Error' });
	}
});

// POST /api/v1/isin/signing
router.post('/signing', async (req, res) => {
	try {
		const { isinId, signatory1, signatory2, ctcSigningDate, ctcSigningPlace } = req.body;
		if (!isinId) return res.status(400).json({ success: false, message: 'isinId is required' });

		const updated = await Isin.findByIdAndUpdate(isinId, {
			signingSignatory1: signatory1,
			signingSignatory2: signatory2,
			ctcSigningDate,
			ctcSigningPlace
		}, { new: true });

		if (!updated) return res.status(404).json({ success: false, message: 'ISIN application not found' });
		return res.json({ success: true, data: updated, message: 'Signing details updated successfully' });
	} catch (e) {
		console.error('Error updating ISIN signing:', e);
		return res.status(500).json({ success: false, message: 'Server Error' });
	}
});

// POST /api/v1/isin/declaration
router.post('/declaration', async (req, res) => {
	try {
		const { isinId, signingPerson, date } = req.body;
		if (!isinId) return res.status(400).json({ success: false, message: 'isinId is required' });

		const updated = await Isin.findByIdAndUpdate(isinId, {
			signingPerson,
			declarationSigningDate: date
		}, { new: true });

		if (!updated) return res.status(404).json({ success: false, message: 'ISIN application not found' });
		return res.json({ success: true, data: updated, message: 'Declaration saved' });
	} catch (e) {
		console.error('Error updating ISIN declaration:', e);
		return res.status(500).json({ success: false, message: 'Server Error' });
	}
});

// POST /api/v1/isin/networth
router.post('/networth', async (req, res) => {
	try {
		const { isinId, paidUpCapital, reserves, networthDate, totalNetworth } = req.body;
		if (!isinId) return res.status(400).json({ success: false, message: 'isinId is required' });

		const updated = await Isin.findByIdAndUpdate(isinId, {
			paidUpCapital,
			reserveSurplus: reserves,
			networthDate,
			totalNetworth
		}, { new: true });

		if (!updated) return res.status(404).json({ success: false, message: 'ISIN application not found' });
		return res.json({ success: true, data: updated, message: 'Networth details updated' });
	} catch (e) {
		console.error('Error updating ISIN networth:', e);
		return res.status(500).json({ success: false, message: 'Server Error' });
	}
});

// POST /api/v1/isin/certificate
router.post('/certificate', async (req, res) => {
	try {
		const { isinId, firmName, pcsName, udin, dateOfSigning } = req.body;
		if (!isinId) return res.status(400).json({ success: false, message: 'isinId is required' });

		const updated = await Isin.findByIdAndUpdate(isinId, {
			certificateFirmName: firmName,
			certificatePcsName: pcsName,
			certificateUdin: udin,
			certificateDateOfSigning: dateOfSigning
		}, { new: true });

		if (!updated) return res.status(404).json({ success: false, message: 'ISIN application not found' });
		return res.json({ success: true, data: updated, message: 'Certificate details saved' });
	} catch (e) {
		console.error('Error updating ISIN certificate:', e);
		return res.status(500).json({ success: false, message: 'Server Error' });
	}
});

// POST /api/v1/isin/fees
router.post('/fees', async (req, res) => {
	try {
		const { isinId, shares, amount } = req.body;
		if (!isinId) return res.status(400).json({ success: false, message: 'isinId is required' });

		const updated = await Isin.findByIdAndUpdate(isinId, {
			totalShares: shares,
			feeAmount: amount
		}, { new: true });

		if (!updated) return res.status(404).json({ success: false, message: 'ISIN application not found' });
		return res.json({ success: true, data: updated, message: 'Fee details updated' });
	} catch (e) {
		console.error('Error updating ISIN fees:', e);
		return res.status(500).json({ success: false, message: 'Server Error' });
	}
});

// POST /api/v1/isin/payment
router.post('/payment', async (req, res) => {
	try {
		const { isinId, isPaid, bankName, date, refNo, mode, amount, tdsAmount } = req.body;
		if (!isinId) return res.status(400).json({ success: false, message: 'isinId is required' });

		const updated = await Isin.findByIdAndUpdate(isinId, {
			isPaid: isPaid ?? true,
			paymentBankName: bankName,
			paymentDate: date,
			paymentRefNo: refNo,
			paymentMode: mode,
			paymentAmount: amount,
			tdsAmount: tdsAmount
		}, { new: true });

		if (!updated) return res.status(404).json({ success: false, message: 'ISIN application not found' });
		return res.json({ success: true, data: updated, message: 'Payment status updated' });
	} catch (e) {
		console.error('Error updating ISIN payment:', e);
		return res.status(500).json({ success: false, message: 'Server Error' });
	}
});
