import { Router } from 'express';

export const router = Router();

// GET /hotels/:id/rooms
router.get('/hotels/:id/rooms', async (req, res) => {
	return res.json({ success: true, data: [{ id: 'r1', name: 'Ocean View Suite', price: 550, status: 'active' }] });
});

// POST /hotels/:id/rooms
router.post('/hotels/:id/rooms', async (req, res) => {
	return res.status(201).json({ success: true, data: req.body });
});

// PUT /rooms/:id
router.put('/rooms/:id', async (req, res) => {
	return res.json({ success: true, data: { id: req.params.id, ...req.body } });
});

// DELETE /rooms/:id (soft delete)
router.delete('/rooms/:id', async (req, res) => {
	return res.json({ success: true, data: { id: req.params.id, status: 'inactive' } });
});

// POST /rooms/:id/images (stub)
router.post('/rooms/:id/images', async (req, res) => {
	return res.json({ success: true, data: { uploadUrls: [], images: [] } });
});
