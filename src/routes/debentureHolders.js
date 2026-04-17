import { Router } from 'express';
import { DebentureHolder } from '../models/DebentureHolder.js';

export const router = Router();

// GET /api/v1/debenture-holders
router.get('/', async (req, res) => {
	try {
		const filter = { isActive: true };
		const data = await DebentureHolder.find(filter).sort({ updatedAt: -1 }).lean();
		return res.json({ success: true, data, message: 'Successfully fetched debenture holders' });
	} catch (e) {
		console.error('Error fetching debenture holders:', e);
		return res.status(500).json({ success: false, message: 'Server Error' });
	}
});

// GET /api/v1/debenture-holders/:id
router.get('/:id', async (req, res) => {
	try {
		const data = await DebentureHolder.findById(req.params.id).lean();
		if (!data) return res.status(404).json({ success: false, message: 'Debenture Holder not found' });
		return res.json({ success: true, data, message: '' });
	} catch (e) {
		console.error('Error fetching debenture holder:', e);
		return res.status(500).json({ success: false, message: 'Server Error' });
	}
});

// POST /api/v1/debenture-holders
router.post('/', async (req, res) => {
	try {
		const payload = req.body || {};
		const created = await DebentureHolder.create(payload);
		return res.status(201).json({ success: true, data: created, message: 'Successfully created debenture holder' });
	} catch (e) {
		if (e?.code === 11000) {
			return res.status(409).json({ success: false, message: 'Duplicate PAN or record exists' });
		}
		console.error('Error creating debenture holder:', e);
		return res.status(400).json({ success: false, message: e.message || 'Validation failed' });
	}
});

// PUT /api/v1/debenture-holders/:id
router.put('/:id', async (req, res) => {
	try {
		const updated = await DebentureHolder.findByIdAndUpdate(req.params.id, req.body, { new: true });
		if (!updated) return res.status(404).json({ success: false, message: 'Debenture Holder not found' });
		return res.json({ success: true, data: updated, message: 'Successfully updated' });
	} catch (e) {
		console.error('Error updating debenture holder:', e);
		return res.status(500).json({ success: false, message: 'Server Error' });
	}
});

// DELETE /api/v1/debenture-holders/:id
router.delete('/:id', async (req, res) => {
	try {
		const removed = await DebentureHolder.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
		if (!removed) return res.status(404).json({ success: false, message: 'Debenture Holder not found' });
		return res.json({ success: true, data: removed, message: 'Successfully removed' });
	} catch (e) {
		console.error('Error deleting debenture holder:', e);
		return res.status(500).json({ success: false, message: 'Server Error' });
	}
});
