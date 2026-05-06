// Single source of truth for admin permissions, shared between backend & web.
// Keep keys stable — they are persisted on Admin docs and used by middleware.

export const PERMISSIONS = [
	{ key: 'hotels:view', label: 'Hotels (view & edit)' },
	{ key: 'hotels:create', label: 'Hotels (create new)' },
	{ key: 'hotels:delete', label: 'Hotels (delete)' },
	{ key: 'bookings:view', label: 'Bookings' },
	{ key: 'booking_history:view', label: 'Booking History' },
	{ key: 'branding:manage', label: 'Branding' },
	{ key: 'addons:manage', label: 'Add-ons' },
	{ key: 'coupons:manage', label: 'Coupons' },
	{ key: 'live_rates:manage', label: 'Live Rates & Discounts' },
	{ key: 'test_booking:use', label: 'Test Booking' },
	{ key: 'users:view', label: 'Users (mobile)' },
]

export const PERMISSION_KEYS = PERMISSIONS.map(p => p.key)

// Default permissions assigned to every new sub-admin when superadmin doesn't customize.
export const DEFAULT_SUBADMIN_PERMISSIONS = [
	'hotels:view',
	'bookings:view',
	'booking_history:view',
	'branding:manage',
	'addons:manage',
	'coupons:manage',
	'live_rates:manage',
	'test_booking:use',
	'users:view',
]

export function hasPermission(admin, perm) {
	if (!admin) return false
	if (admin.role === 'superadmin') return true
	return Array.isArray(admin.permissions) && admin.permissions.includes(perm)
}
