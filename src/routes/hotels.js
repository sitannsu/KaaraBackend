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

// GET /hotels/:id/coupons - Get all coupons for a hotel
router.get('/:id/coupons', async (req, res) => {
	const hotel = await Hotel.findById(req.params.id).select('couponCodes');
	if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });
	return res.json({ success: true, data: hotel.couponCodes || [] });
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

// POST /hotels/:id/coupons - Add a coupon to a hotel
router.post('/:id/coupons', async (req, res) => {
	const { label, code, discount } = req.body || {};
	if (!label || !code) return res.status(400).json({ success: false, message: 'label and code required' });
	
	const hotel = await Hotel.findById(req.params.id);
	if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });
	
	if (!hotel.couponCodes) hotel.couponCodes = [];
	hotel.couponCodes.push({ label, code, discount: discount || 0 });
	await hotel.save();
	
	return res.json({ success: true, data: hotel.couponCodes });
});

// DELETE /hotels/:id/coupons/:couponId - Remove a coupon
router.delete('/:id/coupons/:couponId', async (req, res) => {
	const hotel = await Hotel.findById(req.params.id);
	if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });
	
	hotel.couponCodes = (hotel.couponCodes || []).filter(c => c._id.toString() !== req.params.couponId);
	await hotel.save();
	
	return res.json({ success: true, data: hotel.couponCodes });
});

// POST /hotels/:id/images (stub)
router.post('/:id/images', async (req, res) => {
	return res.json({ success: true, data: { uploadUrls: [], images: [] } });
});

// --- Add-ons (per-hotel customizations like Breakfast, Airport Transfer, Extra Bed) ---

function normalizeAddOnPayload(input = {}) {
	const out = {
		id: input.id ? slugify(String(input.id)) : (input.title ? slugify(String(input.title)) : undefined),
		title: input.title,
		description: input.description,
		price: input.price != null ? Number(input.price) : 0,
		category: input.category,
		isTaxInclusive: !!input.isTaxInclusive,
		defaultSelected: !!input.defaultSelected,
		maxQuantity: input.maxQuantity != null ? Number(input.maxQuantity) : 1,
		isActive: input.isActive != null ? !!input.isActive : true,
	};
	return out;
}

// GET /hotels/:id/addons
router.get('/:id/addons', async (req, res) => {
	const hotel = await Hotel.findById(req.params.id).select('addOns');
	if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });
	return res.json({ success: true, data: hotel.addOns || [] });
});

// POST /hotels/:id/addons
router.post('/:id/addons', async (req, res) => {
	const payload = normalizeAddOnPayload(req.body || {});
	if (!payload.title) return res.status(400).json({ success: false, message: 'title required' });

	const hotel = await Hotel.findById(req.params.id);
	if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });

	hotel.addOns = hotel.addOns || [];
	hotel.addOns.push(payload);
	await hotel.save();
	return res.json({ success: true, data: hotel.addOns });
});

// PUT /hotels/:id/addons/:addonId
router.put('/:id/addons/:addonId', async (req, res) => {
	const hotel = await Hotel.findById(req.params.id);
	if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });

	const addon = (hotel.addOns || []).id(req.params.addonId);
	if (!addon) return res.status(404).json({ success: false, message: 'Add-on not found' });

	const updates = normalizeAddOnPayload({ ...addon.toObject(), ...(req.body || {}) });
	Object.assign(addon, updates);
	await hotel.save();
	return res.json({ success: true, data: hotel.addOns });
});

// DELETE /hotels/:id/addons/:addonId
router.delete('/:id/addons/:addonId', async (req, res) => {
	const hotel = await Hotel.findById(req.params.id);
	if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });

	hotel.addOns = (hotel.addOns || []).filter(a => a._id.toString() !== req.params.addonId);
	await hotel.save();
	return res.json({ success: true, data: hotel.addOns });
});
