import { Router } from 'express'
import crypto from 'crypto'
import multer from 'multer'
import { getPutObjectSignedUrl, uploadBufferToS3 } from '../services/s3.js'

export const router = Router()

// Initialize multer using memory storage
const upload = multer({ storage: multer.memoryStorage() })

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

router.post('/upload-direct', upload.single('file'), async (req, res, next) => {
	try {
		if (!req.file) {
			return res.status(400).json({ success: false, message: 'No file provided' })
		}
		
		const { folder = 'uploads' } = req.body || {}
		const contentType = req.file.mimetype || 'image/jpeg'
		const ext = contentType.split('/')[1] || 'jpg'
		const key = `${folder}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`
		
		const fileUrl = await uploadBufferToS3({
			buffer: req.file.buffer,
			key,
			contentType
		})

		return res.json({ success: true, data: { fileUrl, key } })
	} catch (e) {
		next(e)
	}
})
