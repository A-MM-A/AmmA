require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const AWS = require('aws-sdk');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

// ─── ENVIRONMENT VARIABLES ──────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_BUCKET = process.env.R2_BUCKET;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;


// ─── SUPABASE ADMIN CLIENT ──────────────────────────────────────────────────────
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);


// ─── AWS-S3 (R2) CLIENT ───────────────────────────────────────────────────────────
const s3 = new AWS.S3({
    endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    signatureVersion: 'v4',
    region: 'auto',
});


// ─── ROUTE IMPORTS ────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const likesRoutes = require('./routes/likes');
const reviewsRoutes = require('./routes/reviews');
const uploadRoutes = require('./routes/upload');
const adminRoutes = require('./routes/admin');


// ─── MOUNT ROUTES ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes(supabaseAdmin));          // /api/auth/register, /api/auth/login, /api/auth/callback
app.use('/api/products', productsRoutes(supabaseAdmin));  // /api/products, /api/products/:baseSerial
app.use('/api/cart', cartRoutes(supabaseAdmin));          // /api/cart, /api/cart/:cartId
app.use('/api/like', likesRoutes(supabaseAdmin));         // /api/like (toggle), /api/like/:userId
app.use('/api/reviews', reviewsRoutes(supabaseAdmin));    // /api/reviews/:versionId, /api/reviews
app.use('/api/upload', uploadRoutes(supabaseAdmin, s3, R2_BUCKET, CLOUDFLARE_ACCOUNT_ID));
app.use('/api/admin', adminRoutes(supabaseAdmin));


// ─── START THE SERVER ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🛡️  Server running on port ${PORT}`);
});
