/**
 * backend/routes/upload.js
 * ─────────────────────────
 * Handles:
 *   POST /api/upload  (no auth, multipart/form-data)
 *     → Uploads to Cloudflare R2, returns { key, publicUrl }
 */

const express = require('express');
const multer = require('multer');

module.exports = (s3, R2_BUCKET, CLOUDFLARE_ACCOUNT_ID) => {
  const router = express.Router();

  // Multer setup: store file in memory buffer
  const storage = multer.memoryStorage();
  const upload = multer({ storage });

  // POST /api/upload
  router.post('/', upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const { originalname, buffer, mimetype } = req.file;
    const timestamp = Date.now();
    const key = `${timestamp}_${originalname}`;  // or any other key scheme

    try {
      // Upload to R2
      await s3.putObject({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
        ACL: 'public-read'
      }).promise();

      // Construct public URL
      const publicUrl = `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${key}`;
      res.status(201).json({ key, publicUrl });
    } catch (err) {
      console.error('R2 upload error', err);
      res.status(500).json({ error: 'Failed to upload to R2.' });
    }
  });

  return router;
};