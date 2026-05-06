import { verifyJwt } from '../utils/jwt.js'
import { Admin } from '../models/Admin.js'
import { hasPermission } from '../utils/permissions.js'

function extractToken(req) {
	const header = req.headers.authorization || ''
	if (header.startsWith('Bearer ')) return header.slice(7).trim()
	return null
}

// Verifies JWT, loads the Admin doc, and attaches it to `req.admin`.
// Use on every endpoint that needs auth.
export async function requireAuth(req, res, next) {
	try {
		const token = extractToken(req)
		if (!token) return res.status(401).json({ success: false, message: 'Missing auth token' })
		const payload = verifyJwt(token)
		if (!payload?.sub) return res.status(401).json({ success: false, message: 'Invalid or expired token' })
		const admin = await Admin.findById(payload.sub)
		if (!admin) return res.status(401).json({ success: false, message: 'Admin not found' })
		if (admin.isActive === false) return res.status(403).json({ success: false, message: 'Account disabled' })
		req.admin = {
			id: admin._id.toString(),
			email: admin.email,
			name: admin.name,
			role: admin.role || 'subadmin',
			permissions: admin.permissions || [],
		}
		return next()
	} catch (err) {
		return next(err)
	}
}

export function requireSuperadmin(req, res, next) {
	if (!req.admin) return res.status(401).json({ success: false, message: 'Not authenticated' })
	if (req.admin.role !== 'superadmin') {
		return res.status(403).json({ success: false, message: 'Superadmin only' })
	}
	return next()
}

export function requirePermission(perm) {
	return function (req, res, next) {
		if (!req.admin) return res.status(401).json({ success: false, message: 'Not authenticated' })
		if (!hasPermission(req.admin, perm)) {
			return res.status(403).json({ success: false, message: `Missing permission: ${perm}` })
		}
		return next()
	}
}
