import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { signJwt } from '../utils/jwt.js'
import { Admin } from '../models/Admin.js'
import { requireAuth, requireSuperadmin } from '../middleware/auth.js'
import { DEFAULT_SUBADMIN_PERMISSIONS, PERMISSION_KEYS } from '../utils/permissions.js'

export const router = Router()

function superadminEmailsFromEnv() {
	const raw = process.env.SUPERADMIN_EMAILS || ''
	return new Set(
		raw
			.split(',')
			.map(s => s.trim().toLowerCase())
			.filter(Boolean)
	)
}

function publicAdmin(admin) {
	return {
		id: admin._id,
		email: admin.email,
		name: admin.name,
		role: admin.role || 'subadmin',
		permissions: admin.permissions || [],
		isActive: admin.isActive,
	}
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
	const { email, password } = req.body || {}
	if (!email || !password) return res.status(400).json({ success: false, message: 'email and password required' })

	const admin = await Admin.findOne({ email: String(email).toLowerCase().trim() })
	if (!admin) return res.status(401).json({ success: false, message: 'Invalid credentials' })
	if (admin.isActive === false) return res.status(403).json({ success: false, message: 'Account disabled' })

	const isMatch = await bcrypt.compare(password, admin.password)
	if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' })

	const emailLower = String(admin.email).toLowerCase()
	const envSupers = superadminEmailsFromEnv()
	const superCount = await Admin.countDocuments({ role: 'superadmin' })

	// 1) Emails listed in SUPERADMIN_EMAILS are always superadmin (comma-separated, env on server).
	if (envSupers.has(emailLower)) {
		admin.role = 'superadmin'
		admin.permissions = []
	}
	// 2) Bootstrap: Admin schema defaults role to 'subadmin', so "no role in DB" never happened.
	// If there is still no superadmin in the database, promote whoever logs in next (owner account).
	else if (superCount === 0) {
		admin.role = 'superadmin'
		admin.permissions = []
	}
	// 3) Legacy: documents with missing role field
	else if (!admin.role) {
		admin.role = 'subadmin'
	}

	admin.lastLoginAt = new Date()
	await admin.save()

	const token = signJwt({
		sub: admin._id,
		role: admin.role,
		email: admin.email,
	})
	return res.json({ success: true, token, admin: publicAdmin(admin) })
})

// POST /api/auth/register — superadmin-only (kept for backward compat with old admin form)
// Use POST /api/admin/staff for the new staff-management UI.
router.post('/register', requireAuth, requireSuperadmin, async (req, res) => {
	const { email, password, name, role, permissions } = req.body || {}
	if (!email || !password) return res.status(400).json({ success: false, message: 'email and password required' })

	const cleanEmail = String(email).toLowerCase().trim()
	const exists = await Admin.findOne({ email: cleanEmail })
	if (exists) return res.status(409).json({ success: false, message: 'Admin already exists' })

	const safeRole = role === 'superadmin' ? 'superadmin' : 'subadmin'
	const safePerms = Array.isArray(permissions)
		? permissions.filter(p => PERMISSION_KEYS.includes(p))
		: DEFAULT_SUBADMIN_PERMISSIONS

	const hashed = await bcrypt.hash(password, 10)
	const admin = await Admin.create({
		email: cleanEmail,
		password: hashed,
		name,
		role: safeRole,
		permissions: safeRole === 'superadmin' ? [] : safePerms,
		isActive: true,
		createdBy: req.admin?.id,
	})
	return res.json({ success: true, data: publicAdmin(admin) })
})

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
	return res.json({ success: true, message: 'logged out' })
})

// GET /api/auth/profile — current admin (used by web to know role/permissions on refresh)
router.get('/profile', requireAuth, async (req, res) => {
	const admin = await Admin.findById(req.admin.id)
	if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' })
	return res.json({ success: true, data: publicAdmin(admin) })
})

// POST /api/auth/forgot-password (stub)
router.post('/forgot-password', async (req, res) => {
	return res.json({ success: true, message: 'reset email sent' })
})

// POST /api/auth/reset-password (stub)
router.post('/reset-password', async (req, res) => {
	return res.json({ success: true, message: 'password reset' })
})
