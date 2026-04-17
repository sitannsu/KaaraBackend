import { Router } from 'express';
import { Dir3Kyc } from '../models/Dir3Kyc.js';

export const router = Router();

// GET /api/v1/dir3-kyc?search=&page=1&limit=100
router.get('/', async (req, res) => {
	try {
		const { search, page = 1, limit = 100 } = req.query;
		const filter = { isActive: true };

		if (search) {
			filter.$or = [
				{ directorName: { $regex: search, $options: 'i' } },
				{ din: { $regex: search, $options: 'i' } },
				{ remark: { $regex: search, $options: 'i' } }
			];
		}

		const skip = (parseInt(page) - 1) * parseInt(limit);
		const data = await Dir3Kyc.find(filter)
			.sort({ updatedAt: -1 })
			.skip(skip)
			.limit(parseInt(limit))
			.lean();

		const total = await Dir3Kyc.countDocuments(filter);

		return res.json({
			success: true,
			data,
			pagination: { total, page: parseInt(page), limit: parseInt(limit) },
			message: 'Fetched DIR-3 KYC records'
		});
	} catch (e) {
		console.error('Error fetching DIR-3 KYC records:', e);
		return res.status(500).json({ success: false, message: 'Server Error' });
	}
});

// POST /api/v1/dir3-kyc/check
// Stub for DIN status lookup
router.post('/check', async (req, res) => {
	try {
		const { din } = req.body;
		if (!din) return res.status(400).json({ success: false, message: 'DIN is required' });

		// Attempt to find existing record
		const existing = await Dir3Kyc.findOne({ din }).lean();
		if (existing) {
			return res.json({ success: true, data: existing, message: 'Record found' });
		}

		// Stub for "external" check result if doesn't exist
		const dummyResult = {
			directorName: 'New Director (DIN Lookup)',
			din,
			dinStatus: 'Active',
			kycStatus: 'Pending',
			assignedUser: 'Admin Team',
			userStatus: 'Active',
			remark: 'Record initiated via check'
		};

		// Option to create if not found, or just return dummy data for UI testing
		return res.json({ success: true, data: dummyResult, message: 'DIN status fetched successfully (Demo data)' });
	} catch (e) {
		console.error('Error checking DIN:', e);
		return res.status(500).json({ success: false, message: 'Server Error' });
	}
});

// POST /api/v1/dir3-kyc
// For adding or bulk assigning
router.post('/', async (req, res) => {
	try {
		const payload = req.body || {};
		const created = await Dir3Kyc.create(payload);
		return res.status(201).json({ success: true, data: created, message: 'DIR-3 KYC record created' });
	} catch (e) {
		if (e?.code === 11000) return res.status(409).json({ success: false, message: 'DIN already exists' });
		console.error('Error creating DIR-3 KYC record:', e);
		return res.status(500).json({ success: false, message: 'Server Error' });
	}
});

// POST /api/v1/dir3-kyc/bulk-assign
router.post('/bulk-assign', async (req, res) => {
	try {
		const { ids, assignedTo } = req.body;
		if (!ids || !Array.isArray(ids) || ids.length === 0) {
			return res.status(400).json({ success: false, message: 'Array of ids is required' });
		}

		await Dir3Kyc.updateMany(
			{ _id: { $in: ids } },
			{ $set: { assignedUser: assignedTo } }
		);

		return res.json({ success: true, data: {}, message: `Successfully assigned ${ids.length} records to ${assignedTo}` });
	} catch (e) {
		console.error('Error bulk assigning DIR-3 KYC:', e);
		return res.status(500).json({ success: false, message: 'Server Error' });
	}
});
