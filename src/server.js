import dotenv from 'dotenv';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Explicitly load ../.env (backend/.env)
dotenv.config({ path: `${__dirname}/../.env` });

import app from './app.js';

const port = process.env.PORT || 4000;

app.listen(port, () => {
	console.log(`Karaa API running on http://localhost:${port}`);
});
