import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export function getS3Client() {
	return new S3Client({
		region: process.env.AWS_REGION || 'us-east-1',
		credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
			accessKeyId: process.env.AWS_ACCESS_KEY_ID,
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
		} : undefined,
	})
}

export async function getPutObjectSignedUrl({ key, contentType }) {
	const client = getS3Client()
	const bucket = process.env.S3_BUCKET
	if (!bucket) throw new Error('S3_BUCKET not configured')
	const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType })
	return await getSignedUrl(client, command, { expiresIn: 60 * 5 })
}
