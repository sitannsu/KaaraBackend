import { Router } from 'express'
import crypto from 'crypto'
import { getPutObjectSignedUrl } from '../services/s3.js'

export const router = Router()

router.post('/upload', async (req, res, next) => {
	try {
		const { folder = 'uploads', contentType = 'image/jpeg' } = req.body || {}
		const ext = contentType.split('/')[1] || 'jpg'
		const key = `${folder}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`
		const uploadUrl = await getPutObjectSignedUrl({ key, contentType })
		const u = new URL(uploadUrl)
		const fileUrl = `${u.origin}${u.pathname}`
		return res.json({ success: true, data: { uploadUrl, fileUrl, key } })
	} catch (e) {
		next(e)
	}
})
