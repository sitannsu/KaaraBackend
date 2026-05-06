import { Router } from 'express'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { Admin } from '../models/Admin.js'
import { requireAuth, requireSuperadmin } from '../middleware/auth.js'
import {
	PERMISSIONS,
	PERMISSION_KEYS,
	DEFAULT_SUBADMIN_PERMISSIONS,
} from '../utils/permissions.js'

export const router = Router()

function publicAdmin(admin) {
	return {
		_id: admin._id,
		id: admin._id,
		email: admin.email,
		name: admin.name,
		role: admin.role,
		permissions: admin.permissions || [],
		isActive: admin.isActive !== false,
		createdAt: admin.createdAt,
		updatedAt: admin.updatedAt,
		lastLoginAt: admin.lastLoginAt,
	}
}

// GET /api/admin/permissions — returns the permission catalog (used by UI)
router.get('/permissions', requireAuth, requireSuperadmin, async (req, res) => {
	return res.json({
		success: true,
		data: {
			all: PERMISSIONS,
			defaultSubadmin: DEFAULT_SUBADMIN_PERMISSIONS,
		},
	})
})

// GET /api/admin/staff — list all admin users
router.get('/staff', requireAuth, requireSuperadmin, async (req, res) => {
	const list = await Admin.find({})
		.sort({ createdAt: -1 })
		.select('-password')
		.lean()
	return res.json({ success: true, data: list.map(publicAdmin) })
})

// POST /api/admin/staff — create a sub-admin (or another superadmin)
router.post('/staff', requireAuth, requireSuperadmin, async (req, res) => {
	const { email, password, name, role, permissions } = req.body || {}
	if (!email || !password) {
		return res.status(400).json({ success: false, message: 'email and password required' })
	}

	const cleanEmail = String(email).toLowerCase().trim()
	const exists = await Admin.findOne({ email: cleanEmail })
	if (exists) return res.status(409).json({ success: false, message: 'Admin with this email already exists' })

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
		createdBy: req.admin.id,
	})
	return res.status(201).json({ success: true, data: publicAdmin(admin) })
})

// PATCH /api/admin/staff/:id — update name, role, permissions, isActive
router.patch('/staff/:id', requireAuth, requireSuperadmin, async (req, res) => {
	const { id } = req.params
	if (!mongoose.isValidObjectId(id)) {
		return res.status(400).json({ success: false, message: 'Invalid id' })
	}
	const admin = await Admin.findById(id)
	if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' })

	const { name, role, permissions, isActive } = req.body || {}

	if (typeof name === 'string') admin.name = name
	if (role === 'superadmin' || role === 'subadmin') {
		// Don't allow demoting the last remaining superadmin
		if (admin.role === 'superadmin' && role === 'subadmin') {
			const supersLeft = await Admin.countDocuments({ role: 'superadmin', _id: { $ne: admin._id } })
			if (supersLeft === 0) {
				return res.status(400).json({ success: false, message: 'Cannot demote the last superadmin' })
			}
		}
		admin.role = role
	}
	if (Array.isArray(permissions)) {
		admin.permissions = admin.role === 'superadmin'
			? []
			: permissions.filter(p => PERMISSION_KEYS.includes(p))
	}
	if (typeof isActive === 'boolean') {
		// Don't allow deactivating the last remaining active superadmin
		if (admin.role === 'superadmin' && isActive === false) {
			const activeSupers = await Admin.countDocuments({
				role: 'superadmin', isActive: { $ne: false }, _id: { $ne: admin._id },
			})
			if (activeSupers === 0) {
				return res.status(400).json({ success: false, message: 'Cannot deactivate the last active superadmin' })
			}
		}
		admin.isActive = isActive
	}

	await admin.save()
	return res.json({ success: true, data: publicAdmin(admin) })
})

// PATCH /api/admin/staff/:id/password — reset a staff member's password
router.patch('/staff/:id/password', requireAuth, requireSuperadmin, async (req, res) => {
	const { id } = req.params
	const { password } = req.body || {}
	if (!password || password.length < 6) {
		return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' })
	}
	const admin = await Admin.findById(id)
	if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' })

	admin.password = await bcrypt.hash(password, 10)
	await admin.save()
	return res.json({ success: true, message: 'Password updated' })
})

// DELETE /api/admin/staff/:id — hard delete (forbid deleting yourself or last superadmin)
router.delete('/staff/:id', requireAuth, requireSuperadmin, async (req, res) => {
	const { id } = req.params
	if (id === req.admin.id) {
		return res.status(400).json({ success: false, message: 'You cannot delete your own account' })
	}
	const admin = await Admin.findById(id)
	if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' })

	if (admin.role === 'superadmin') {
		const supersLeft = await Admin.countDocuments({ role: 'superadmin', _id: { $ne: admin._id } })
		if (supersLeft === 0) {
			return res.status(400).json({ success: false, message: 'Cannot delete the last superadmin' })
		}
	}
	await admin.deleteOne()
	return res.json({ success: true, message: 'Admin deleted' })
})
