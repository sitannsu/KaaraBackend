import { Router } from 'express';
import { Hotel } from '../models/Hotel.js';
import { slugify } from '../utils/slug.js';

export const router = Router();

async function generateUniqueSlug(base) {
	let candidate = base;
	let i = 2;
	// loop capped for safety
	while (await Hotel.exists({ slug: candidate })) {
		candidate = `${base}-${i}`;
		i += 1;
		if (i > 1000) break;
	}
	return candidate;
}

// GET /hotels?city=&q=
router.get('/', async (req, res) => {
	const { city, q } = req.query;
	const filter = { isActive: true };
	if (city) filter.city = city;
	if (q) filter.name = { $regex: q, $options: 'i' };
	const data = await Hotel.find(filter).sort({ updatedAt: -1 }).limit(200).lean();
	return res.json({ success: true, data });
});

router.get('/:id', async (req, res) => {
	const { id } = req.params;
	const byId = await Hotel.findById(id).lean();
	if (byId) return res.json({ success: true, data: byId });
	const bySlug = await Hotel.findOne({ slug: id }).lean();
	if (bySlug) return res.json({ success: true, data: bySlug });
	return res.status(404).json({ success: false, message: 'Hotel not found' });
});

router.post('/', async (req, res) => {
	const payload = req.body || {};
	if (payload.amenities && typeof payload.amenities === 'string') payload.amenities = payload.amenities.split(',').map(s => s.trim())
	if (payload.name && !payload.slug) payload.slug = slugify(payload.name);
	// ensure unique slug
	payload.slug = await generateUniqueSlug(payload.slug || slugify(String(Date.now())));
	try {
		const created = await Hotel.create(payload);
		return res.status(201).json({ success: true, data: created });
	} catch (e) {
		if (e?.code === 11000 && e?.keyPattern?.slug) {
			return res.status(409).json({ success: false, message: 'Slug already exists' });
		}
		throw e;
	}
});

router.put('/:id', async (req, res) => {
	const updates = req.body || {};
	if (updates.amenities && typeof updates.amenities === 'string') updates.amenities = updates.amenities.split(',').map(s => s.trim())
	if (updates.name && !updates.slug) updates.slug = slugify(updates.name);
	if (updates.slug) updates.slug = await generateUniqueSlug(updates.slug);
	const updated = await Hotel.findByIdAndUpdate(req.params.id, updates, { new: true });
	if (!updated) return res.status(404).json({ success: false, message: 'Hotel not found' });
	return res.json({ success: true, data: updated });
});

router.delete('/:id', async (req, res) => {
	const removed = await Hotel.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
	if (!removed) return res.status(404).json({ success: false, message: 'Hotel not found' });
	return res.json({ success: true, data: removed });
});

// POST /hotels/:id/images (stub)
router.post('/:id/images', async (req, res) => {
	return res.json({ success: true, data: { uploadUrls: [], images: [] } });
});
