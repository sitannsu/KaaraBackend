import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';

import { router as healthRouter } from './routes/health.js';
import { router as authRouter } from './routes/auth.js';
import { router as adminAuthRouter } from './routes/adminAuth.js';
import { router as hotelRouter } from './routes/hotels.js';
import { router as roomRouter } from './routes/rooms.js';
import { router as bookingRouter } from './routes/bookings.js';
import { router as paymentRouter } from './routes/payments.js';
import { router as adminRouter } from './routes/admin.js';
import { router as analyticsRouter } from './routes/analytics.js';
import { router as filesRouter } from './routes/files.js';
import { router as integrationsRouter } from './routes/integrations.js';
import { router as liveRatesRouter } from './routes/liveRates.js';

const app = express();

// Core middleware
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

// DB connect (lazy, logs if missing)
// Fallback URI if .env not loaded - password has # so use %23
const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://kaara:flutter2023%23@cluster0.kizfgyl.mongodb.net/kaara?retryWrites=true&w=majority';
if (mongoUri) {
	mongoose
		.connect(mongoUri, { serverSelectionTimeoutMS: 10000 })
		.then(() => console.log('MongoDB connected'))
		.catch((err) => console.error('MongoDB connection error:', err.message));
	
	// Log connection state changes
	mongoose.connection.on('connected', () => console.log('MongoDB: connected'));
	mongoose.connection.on('disconnected', () => console.warn('MongoDB: disconnected'));
	mongoose.connection.on('error', (err) => console.error('MongoDB error:', err));
} else {
	console.warn('MONGODB_URI not set. API will run without DB.');
}

// Rate limit for OTP
const otpLimiter = rateLimit({ windowMs: 60 * 1000, max: 5 });

// Helper to mount under both /v1 and /api where needed
function mount(path, router) {
	app.use(`/v1${path}`, router);
	app.use(`/api${path}`, router);
}

// Routes
mount('/health', healthRouter);
app.use('/v1/auth', otpLimiter, authRouter);
app.use('/api/auth', adminAuthRouter); // admin auth spec
mount('/hotels', hotelRouter);
app.use('/v1', roomRouter); // exposes /hotels/:id/rooms and /rooms/:id
app.use('/api', roomRouter);
mount('/bookings', bookingRouter);
mount('/payment', paymentRouter);
app.use('/v1/admin', adminRouter);
app.use('/api/admin', adminRouter);
mount('/analytics', analyticsRouter);
mount('/files', filesRouter);
mount('/integrations', integrationsRouter);
mount('/live-rates', liveRatesRouter);

// 404 handler
app.use((req, res) => {
	res.status(404).json({ success: false, message: 'Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
	console.error(err);
	res.status(err.status || 500).json({ success: false, message: err.message || 'Server Error' });
});

export default app;
