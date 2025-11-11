import { Router } from 'express'

export const router = Router()

router.post('/channel-sync', async (req, res) => {
	return res.json({ success: true, message: 'Channel sync queued' })
})
