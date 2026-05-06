import admin from 'firebase-admin';
import { User } from '../models/User.js';
import { serviceAccountConfig } from './firebaseConfig.js';

// Initialize Firebase Admin SDK
let firebaseInitialized = false;

try {
	// Check if Firebase is already initialized
	if (admin.apps.length === 0) {
		// Use the embedded service account configuration
		admin.initializeApp({
			credential: admin.credential.cert(serviceAccountConfig),
		});
		console.log('Firebase Admin SDK initialized successfully for project:', serviceAccountConfig.project_id);
	}
	firebaseInitialized = admin.apps.length > 0;
} catch (error) {
	console.error('Error initializing Firebase Admin SDK:', error.message);
}

class PushNotificationService {
	/**
	 * Send a push notification to a single user
	 * @param {string} userId - User ID
	 * @param {Object} notification - Notification object with title, body, data
	 * @returns {Promise<Object>} Result of the send operation
	 */
	async sendToUser(userId, notification) {
		try {
			if (!firebaseInitialized) {
				console.log(`[Push Notification - SIMULATED] To user ${userId}:`, notification);
				return { success: true, simulated: true };
			}

			// Get user's FCM token
			const user = await User.findById(userId);
			if (!user || !user.fcmToken) {
				console.log(`User ${userId} has no FCM token, skipping push notification`);
				return { success: false, error: 'No FCM token found' };
			}

			const message = {
				token: user.fcmToken,
				notification: {
					title: notification.title,
					body: notification.body,
				},
				data: notification.data || {},
				android: {
					priority: 'high',
					notification: {
						channelId: 'default',
						priority: 'high',
						defaultSound: true,
						defaultVibrateTimings: true,
					},
				},
				apns: {
					payload: {
						aps: {
							sound: 'default',
							badge: 1,
						},
					},
				},
			};

			const response = await admin.messaging().send(message);
			console.log(`Push notification sent to user ${userId}:`, response);
			return { success: true, messageId: response };
		} catch (error) {
			console.error(`Error sending push notification to user ${userId}:`, error);
			return { success: false, error: error.message };
		}
	}

	/**
	 * Send a push notification to all users (broadcast)
	 * @param {Object} notification - Notification object with title, body, data
	 * @returns {Promise<Object>} Result of the send operation
	 */
	async sendToAll(notification) {
		try {
			if (!firebaseInitialized) {
				console.log(`[Push Notification - SIMULATED] Broadcast to all users:`, notification);
				return { success: true, simulated: true };
			}

			// Get all users with FCM tokens
			const users = await User.find({ fcmToken: { $ne: null } });
			const tokens = users.map(u => u.fcmToken).filter(Boolean);

			if (tokens.length === 0) {
				console.log('No users with FCM tokens found, skipping broadcast');
				return { success: true, sent: 0 };
			}

			const message = {
				notification: {
					title: notification.title,
					body: notification.body,
				},
				data: notification.data || {},
				android: {
					priority: 'high',
					notification: {
						channelId: 'default',
						priority: 'high',
						defaultSound: true,
						defaultVibrateTimings: true,
					},
				},
				apns: {
					payload: {
						aps: {
							sound: 'default',
							badge: 1,
						},
					},
				},
			};

			// Send multicast message
			const response = await admin.messaging().sendEachForMulticast({
				tokens,
				...message,
			});

			console.log(`Broadcast push notification sent to ${response.successCount} users, ${response.failureCount} failed`);

			// Clean up invalid tokens
			if (response.responses) {
				const failedTokens = [];
				response.responses.forEach((resp, idx) => {
					if (!resp.success) {
						failedTokens.push(tokens[idx]);
						// Log error for debugging
						console.error(`Failed to send to token ${tokens[idx].substring(0, 20)}...:`, resp.error?.message);
					}
				});

				// Remove invalid tokens from database
				if (failedTokens.length > 0) {
					await User.updateMany(
						{ fcmToken: { $in: failedTokens } },
						{ $set: { fcmToken: null, fcmTokenUpdatedAt: null } }
					);
					console.log(`Cleared ${failedTokens.length} invalid FCM tokens`);
				}
			}

			return {
				success: true,
				sent: response.successCount,
				failed: response.failureCount,
			};
		} catch (error) {
			console.error('Error sending broadcast push notification:', error);
			return { success: false, error: error.message };
		}
	}

	/**
	 * Send a data-only message (silent notification)
	 * @param {string} userId - User ID
	 * @param {Object} data - Data payload
	 * @returns {Promise<Object>} Result of the send operation
	 */
	async sendDataMessage(userId, data) {
		try {
			if (!firebaseInitialized) {
				console.log(`[Data Message - SIMULATED] To user ${userId}:`, data);
				return { success: true, simulated: true };
			}

			const user = await User.findById(userId);
			if (!user || !user.fcmToken) {
				return { success: false, error: 'No FCM token found' };
			}

			const message = {
				token: user.fcmToken,
				data: data || {},
				android: {
					priority: 'high',
				},
				apns: {
					payload: {
						aps: {
							contentAvailable: true,
						},
					},
				},
			};

			const response = await admin.messaging().send(message);
			console.log(`Data message sent to user ${userId}:`, response);
			return { success: true, messageId: response };
		} catch (error) {
			console.error(`Error sending data message to user ${userId}:`, error);
			return { success: false, error: error.message };
		}
	}
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
