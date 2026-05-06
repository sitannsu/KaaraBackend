import { Router } from 'express';
import mongoose from 'mongoose';
import { Room } from '../models/Room.js';

export const router = Router();

// GET /hotels/:id/rooms — list rooms for a hotel
router.get('/hotels/:id/rooms', async (req, res, next) => {
	try {
		const { id } = req.params;
		const filter = mongoose.isValidObjectId(id) ? { hotelId: id } : { hotelId: null };
		const rooms = await Room.find(filter).sort({ createdAt: 1 }).lean();
		return res.json({ success: true, data: rooms });
	} catch (err) {
		console.error('[rooms] list failed', err);
		return next(err);
	}
});

// POST /hotels/:id/rooms — create a room under a hotel
router.post('/hotels/:id/rooms', async (req, res, next) => {
	try {
		const { id } = req.params;
		if (!mongoose.isValidObjectId(id)) {
			return res.status(400).json({ success: false, message: 'Invalid hotel id' });
		}
		const payload = { ...(req.body || {}), hotelId: id };
		// Coerce numeric fields that arrive as strings from the form.
		if (payload.price != null) payload.price = Number(payload.price);
		if (payload.occupancy != null) payload.occupancy = Number(payload.occupancy);
		if (payload.inventory != null) payload.inventory = Number(payload.inventory);
		if (payload.roomSizeSqft != null) payload.roomSizeSqft = Number(payload.roomSizeSqft);
		if (payload.bathrooms != null) payload.bathrooms = Number(payload.bathrooms);
		const room = await Room.create(payload);
		return res.status(201).json({ success: true, data: room });
	} catch (err) {
		console.error('[rooms] create failed', err);
		return next(err);
	}
});

// PUT /rooms/:id — update an existing room
router.put('/rooms/:id', async (req, res, next) => {
	try {
		const { id } = req.params;
		if (!mongoose.isValidObjectId(id)) {
			return res.status(400).json({ success: false, message: 'Invalid room id' });
		}
		const update = { ...(req.body || {}) };
		// Don't allow hotelId reassignment via this endpoint.
		delete update.hotelId;
		const room = await Room.findByIdAndUpdate(id, update, { new: true, runValidators: true });
		if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
		return res.json({ success: true, data: room });
	} catch (err) {
		console.error('[rooms] update failed', err);
		return next(err);
	}
});

// DELETE /rooms/:id — soft-delete by flipping status to inactive
router.delete('/rooms/:id', async (req, res, next) => {
	try {
		const { id } = req.params;
		if (!mongoose.isValidObjectId(id)) {
			return res.status(400).json({ success: false, message: 'Invalid room id' });
		}
		const room = await Room.findByIdAndUpdate(
			id,
			{ status: 'inactive' },
			{ new: true }
		);
		if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
		return res.json({ success: true, data: room });
	} catch (err) {
		console.error('[rooms] delete failed', err);
		return next(err);
	}
});

// POST /rooms/:id/images — append uploaded image URLs to a room
router.post('/rooms/:id/images', async (req, res, next) => {
	try {
		const { id } = req.params;
		if (!mongoose.isValidObjectId(id)) {
			return res.status(400).json({ success: false, message: 'Invalid room id' });
		}
		const incoming = Array.isArray(req.body?.images) ? req.body.images : [];
		const room = await Room.findByIdAndUpdate(
			id,
			{ $addToSet: { images: { $each: incoming } } },
			{ new: true }
		);
		if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
		return res.json({ success: true, data: { images: room.images } });
	} catch (err) {
		console.error('[rooms] image attach failed', err);
		return next(err);
	}
});
