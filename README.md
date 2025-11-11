# Karaa Backend (Express + MongoDB)

Run locally:

```bash
npm install
npm run dev
```

Env vars (see `.env.example`):
- `PORT` (default 4000)
- `MONGODB_URI`
- `JWT_SECRET`
- `CLIENT_ORIGIN`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET` (for uploads)

Example `MONGODB_URI` (based on your cluster; password contains `#`, so it must be URL-encoded as `%23`):

```bash
MONGODB_URI="mongodb+srv://kaara:flutter2023%23@cluster0.kizfgyl.mongodb.net/kaara?retryWrites=true&w=majority"
```

S3 signed upload:
- `POST /api/files/upload` with JSON `{ folder?: 'uploads', contentType?: 'image/jpeg' }`
- Response: `{ uploadUrl, fileUrl, key }`
- PUT your file bytes to `uploadUrl` with `Content-Type` header matching the contentType.

Base URL: `/v1` and `/api`

Key endpoints:
- `GET /api/health`
- Hotels CRUD under `/api/hotels`
