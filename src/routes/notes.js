import { Router } from 'express';
import { Note } from '../models/Note.js';

export const router = Router();

// GET /api/v1/notes?search=&page=1&limit=100
router.get('/', async (req, res) => {
	try {
		const { search, page = 1, limit = 100 } = req.query;
		const query = { isActive: true };
		
		if (search) {
			query.$or = [
				{ title: { $regex: search, $options: 'i' } },
				{ description: { $regex: search, $options: 'i' } }
			];
		}

		const skip = (parseInt(page) - 1) * parseInt(limit);
		const data = await Note.find(query)
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(parseInt(limit))
			.lean();
			
		const total = await Note.countDocuments(query);

		return res.json({ 
			success: true, 
			data, 
			pagination: { total, page: parseInt(page), limit: parseInt(limit) },
			message: 'Successfully fetched notes'
		});
	} catch (e) {
		console.error('Error fetching notes:', e);
		return res.status(500).json({ success: false, message: 'Server Error' });
	}
});

// GET /api/v1/notes/:id
router.get('/:id', async (req, res) => {
	try {
		const data = await Note.findById(req.params.id).lean();
		if (!data) return res.status(404).json({ success: false, message: 'Note not found' });
		return res.json({ success: true, data, message: '' });
	} catch (e) {
		console.error('Error fetching note:', e);
		return res.status(500).json({ success: false, message: 'Server Error' });
	}
});

// POST /api/v1/notes
router.post('/', async (req, res) => {
	try {
		const { title, description, labels, files } = req.body;
		if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

		const created = await Note.create({ title, description, labels, files });
		return res.status(201).json({ success: true, data: created, message: 'Successfully created note' });
	} catch (e) {
		console.error('Error creating note:', e);
		return res.status(400).json({ success: false, message: e.message || 'Validation failed' });
	}
});

// PUT /api/v1/notes/:id
router.put('/:id', async (req, res) => {
	try {
		const updated = await Note.findByIdAndUpdate(req.params.id, req.body, { new: true });
		if (!updated) return res.status(404).json({ success: false, message: 'Note not found' });
		return res.json({ success: true, data: updated, message: 'Successfully updated' });
	} catch (e) {
		console.error('Error updating note:', e);
		return res.status(500).json({ success: false, message: 'Server Error' });
	}
});

// DELETE /api/v1/notes/:id
router.delete('/:id', async (req, res) => {
	try {
		const removed = await Note.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
		if (!removed) return res.status(404).json({ success: false, message: 'Note not found' });
		return res.json({ success: true, data: removed, message: 'Successfully removed' });
	} catch (e) {
		console.error('Error deleting note:', e);
		return res.status(500).json({ success: false, message: 'Server Error' });
	}
});
