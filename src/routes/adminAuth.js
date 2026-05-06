import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { signJwt } from '../utils/jwt.js'
import { Admin } from '../models/Admin.js'
import { requireAuth, requireSuperadmin } from '../middleware/auth.js'
import { DEFAULT_SUBADMIN_PERMISSIONS, PERMISSION_KEYS } from '../utils/permissions.js'

export const router = Router()

function publicAdmin(admin) {
	return {
		id: admin._id,
		email: admin.email,
		name: admin.name,
		role: admin.role,
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

	// Auto-promote pre-existing admin docs (created before role field existed) to superadmin
	// so the original owner is not locked out after this migration.
	if (!admin.role) {
		const totalSuperadmins = await Admin.countDocuments({ role: 'superadmin' })
		admin.role = totalSuperadmins === 0 ? 'superadmin' : 'subadmin'
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
