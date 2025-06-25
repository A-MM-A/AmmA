/**
 * backend/routes/upload.js
 * ─────────────────────────
 * Handles:
 *   POST /api/upload  (no auth, multipart/form-data)
 *     → Uploads to Cloudflare R2, returns { key, publicUrl }
 *
 * Dependencies: express, multer, express-rate-limit, fluent-ffmpeg,
 *               tmp-promise, aws-sdk (S3), fs/promises
 */

const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
const tmp = require('tmp-promise');
const fs = require('fs').promises;

module.exports = (s3, R2_BUCKET, CLOUDFLARE_ACCOUNT_ID) => {
  const router = express.Router();

  // ── 1) Rate limiter ───────────────────────────────────────────────
  const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 20,               // limit each IP to 20 upload requests
    message: { error: 'Too many uploads; please wait 15 minutes.' }
  });
  router.use(uploadLimiter);

  // ── 2) Multer setup (memory, 50 MB max, images/videos only) ──────
  const storage = multer.memoryStorage();
  const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },  // 50 MiB
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/') ||
        file.mimetype.startsWith('video/')) {
        cb(null, true);
      } else {
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only image/video allowed'));
      }
    }
  });

  // ── 3) POST /api/upload - Upload Route ───────────────────────────────────────────────
  router.post('/', upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    let { originalname, buffer, mimetype } = req.file;
    let uploadBuffer = buffer;
    const ext = originalname.split('.').pop().toLowerCase();

    // // ── 3a) If video, transcode via FFmpeg ─────────────────────────
    // if (mimetype.startsWith('video/')) {

    //   // adjust filename & MIME
    //   originalname = originalname.replace(/\.\w+$/, '.mp4');
    //   mimetype = 'video/mp4';
    // }
    if (mimetype === 'video/webm') {
      const inPath = await writeTempFile(buffer, '.webm');
      const outPath = inPath.replace(/\.webm$/, '.mp4');
      await new Promise((resolve, reject) => {
        ffmpeg(inPath)
          .outputOptions('-c copy')        // just remux, no re-encode
          .on('end', resolve)
          .on('error', reject)
          .save(outPath);
      });
      buffer = await fs.readFile(outPath);
      mimetype = 'video/mp4';
      key = key.replace(/\.webm$/, '.mp4');
    }

    // ── 3b) Upload to R2 ────────────────────────────────────────────
    const key = originalname;  // or prefix with folders as you like
    try {
      await s3.putObject({
        Bucket: R2_BUCKET,
        Key: key,
        Body: uploadBuffer,
        ContentType: mimetype,
        ACL: 'public-read'
      }).promise();

      const publicUrl = `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${key}`;
      return res.status(201).json({ key, publicUrl });

    } catch (err) {
      console.error('R2 upload error', err);
      return res.status(500).json({ error: 'Failed to upload to R2.' });
    }
  });

  // ── 4) Multer error handler ───────────────────────────────────────
  router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Max is 50 MB.' });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: err.message });
      }
    }
    next(err);
  });

  return router;
};
