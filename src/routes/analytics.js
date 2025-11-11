import { Router } from 'express'

export const router = Router()

// GET /api/analytics/dashboard
router.get('/dashboard', async (req, res) => {
	return res.json({ success: true, data: { occupancyRate: 0.72, totalRevenue: 125000, cancellations: 12, arr: 185 } })
})

// GET /api/analytics/hotels/:id
router.get('/hotels/:id', async (req, res) => {
	return res.json({ success: true, data: { hotelId: req.params.id, byMonth: [] } })
})

// GET /api/analytics/export
router.get('/export', async (req, res) => {
	return res.json({ success: true, data: { url: 's3://reports/demo.pdf' } })
})
