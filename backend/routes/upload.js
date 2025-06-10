/**
 * backend/routes/upload.js
 * ─────────────────────────
 * Handles:
 *   POST /api/upload  (authenticated, multipart/form-data)
 *     → Uploads to Cloudflare R2 (S3 compatible), returns { key, publicUrl }
 */

const express = require('express');
const multer = require('multer');
module.exports = (supabaseAdmin, s3, R2_BUCKET, CLOUDFLARE_ACCOUNT_ID) => {
  const router = express.Router();

  // Middleware: Authenticate JWT
  async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer '))
      return res.status(401).json({ error: 'Missing or invalid authorization header.' });

    const token = authHeader.split(' ')[1];
    try {
      const {
        data: { user },
        error,
      } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) throw error || new Error('Invalid token');
      req.user = user;
      next();
    } catch (err) {
      console.error(err);
      res.status(401).json({ error: 'Unauthorized' });
    }
  }

  // Multer setup: store file in memory buffer
  const storage = multer.memoryStorage();
  const upload = multer({ storage });

  // POST /api/upload
  router.post('/', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const userId = req.user.id;
    const { originalname, buffer, mimetype } = req.file;

    // Generate unique key: userId/timestamp_filename.ext
    const timestamp = Date.now();
    const key = `${userId}/${timestamp}_${originalname}`;

    try {
      // Upload to R2
      await s3
        .putObject({
          Bucket: R2_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: mimetype,
          ACL: 'public-read', // ensures public read
        })
        .promise();

      // Construct public URL
      const publicUrl = `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${key}`;
      res.status(201).json({ key, publicUrl });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to upload to R2.' });
    }
  });

  return router;
};