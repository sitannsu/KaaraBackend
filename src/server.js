import dotenv from 'dotenv';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Explicitly load ../.env (backend/.env)
dotenv.config({ path: `${__dirname}/../.env` });

import app from './app.js';

const basePort = Number(process.env.PORT) || 4000;

function startServer(port, attemptsLeft = 5) {
	const server = app
		.listen(port, () => {
			console.log(`Karaa API running on http://localhost:${port}`);
		})
		.on('error', (err) => {
			if (err && err.code === 'EADDRINUSE' && attemptsLeft > 0) {
				const nextPort = port + 1;
				console.warn(`Port ${port} in use, retrying on ${nextPort}...`);
				startServer(nextPort, attemptsLeft - 1);
			} else {
				console.error('Failed to start server:', err);
				process.exit(1);
			}
		});
	return server;
}

startServer(basePort);
