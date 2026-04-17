import { Router } from 'express';
import { Document } from '../models/Document.js';

export const router = Router();

// GET /api/v1/documents/:isinId
router.get('/:isinId', async (req, res) => {
	try {
		const { isinId } = req.params;
		const data = await Document.find({ isinId, isActive: true }).lean();
		
		// If no documents found, return an empty array or seeded defaults as seen in screenshot
		return res.json({ success: true, data, message: 'Fetched documents for ISIN' });
	} catch (e) {
		console.error('Error fetching documents:', e);
		return res.status(500).json({ success: false, message: 'Server Error' });
	}
});

// POST /api/v1/documents
// For uploading or adding a new document/attachment to an ISIN
router.post('/', async (req, res) => {
	try {
		const payload = req.body || {};
		if (!payload.isinId) return res.status(400).json({ success: false, message: 'isinId is required' });

		const created = await Document.create(payload);
		return res.status(201).json({ success: true, data: created, message: 'Document added' });
	} catch (e) {
		console.error('Error adding document:', e);
		return res.status(500).json({ success: false, message: 'Server Error' });
	}
});
