import jwt from 'jsonwebtoken'

export function signJwt(payload, expiresIn = '7d') {
	return jwt.sign(payload, process.env.JWT_SECRET || 'dev', { expiresIn })
}

export function verifyJwt(token) {
	try {
		return jwt.verify(token, process.env.JWT_SECRET || 'dev')
	} catch (e) {
		return null
	}
}
