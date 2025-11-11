import { Router } from 'express'
import { signJwt } from '../utils/jwt.js'
import { Admin } from '../models/Admin.js'
import bcrypt from 'bcryptjs'

export const router = Router()

// POST /api/auth/login
router.post('/login', async (req, res) => {
	const { email, password } = req.body || {}
	if (!email || !password) return res.status(400).json({ success: false, message: 'email and password required' })
	const admin = await Admin.findOne({ email })
	if (!admin) return res.status(401).json({ success: false, message: 'Invalid credentials' })
	const isMatch = await bcrypt.compare(password, admin.password)
	if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' })
	const token = signJwt({ sub: admin._id, role: 'admin', email: admin.email })
	return res.json({ success: true, token })
})

// POST /api/auth/register
router.post('/register', async (req, res) => {
	const { email, password, name } = req.body || {}
	if (!email || !password) return res.status(400).json({ success: false, message: 'email and password required' })
	const exists = await Admin.findOne({ email })
	if (exists) return res.status(409).json({ success: false, message: 'Admin already exists' })
	const hashed = await bcrypt.hash(password, 10)
	const admin = await Admin.create({ email, password: hashed, name })
	return res.json({ success: true, data: { id: admin._id, email: admin.email, name: admin.name } })
})

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
	return res.json({ success: true, message: 'logged out' })
})

// GET /api/auth/profile
router.get('/profile', async (req, res) => {
	return res.json({ success: true, data: { id: 'admin_demo', email: 'admin@kaara.com', role: 'admin' } })
})

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
	return res.json({ success: true, message: 'reset email sent' })
})

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
	return res.json({ success: true, message: 'password reset' })
})
