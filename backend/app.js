require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const AWS = require('aws-sdk');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_BUCKET = process.env.R2_BUCKET;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

// Initialize Supabase Admin client
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Initialize R2 (S3) client
const s3 = new AWS.S3({
    endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    signatureVersion: 'v4',
    region: 'auto',
});

// Multer setup for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ─── ROUTES ───────────────────────────────────────────────────────────────────

// 3.2.1 GET /api/products
app.get('/api/products', async (req, res) => {
    try {
        // Fetch all products
        const { data: products, error: productsError } = await supabaseAdmin
            .from('products')
            .select('*')
            .order('id', { ascending: true });

        if (productsError) throw productsError;

        // For each product, fetch its versions
        const productsWithVersions = await Promise.all(
            products.map(async (product) => {
                const { data: versions, error: versionsError } = await supabaseAdmin
                    .from('product_versions')
                    .select('*')
                    .eq('product_id', product.id)
                    .order('id', { ascending: true });
                if (versionsError) throw versionsError;
                return { ...product, versions };
            })
        );

        res.json({ data: productsWithVersions });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch products.' });
    }
});

// 3.2.2 GET /api/products/:baseSerial
app.get('/api/products/:baseSerial', async (req, res) => {
    const { baseSerial } = req.params;
    try {
        // Fetch product by baseSerial
        const { data: productArr, error: productError } = await supabaseAdmin
            .from('products')
            .select('*')
            .eq('baseSerial', baseSerial)
            .limit(1);

        if (productError) throw productError;
        if (productArr.length === 0)
            return res.status(404).json({ error: 'Product not found.' });

        const product = productArr[0];

        // Fetch versions
        const { data: versions, error: versionsError } = await supabaseAdmin
            .from('product_versions')
            .select('*')
            .eq('product_id', product.id)
            .order('id', { ascending: true });
        if (versionsError) throw versionsError;

        res.json({ data: { ...product, versions } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch product.' });
    }
});

// 3.2.3 POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        const { user, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
        });
        if (error) throw error;
        res.status(201).json({ user });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
});

// 3.2.4 POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data, error } = await supabaseAdmin.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        // Return the session to the client
        res.json({ session: data.session });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
});

// 3.2.5 POST /api/auth/callback
app.post('/api/auth/callback', async (req, res) => {
    // Supabase’s built-in OAuth redirect is handled client-side by @supabase/supabase-js.
    // If you want to verify the URL server-side, you can parse req.query for "access_token" or "code"
    // and exchange it via supabaseAdmin.auth.exchangeCodeForSession(code). For simplicity, we leave this minimal.
    res.json({ message: 'OAuth callback hit. Client will handle session extraction.' });
});

// Middleware: Authenticate JWT from Authorization header
async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer '))
        return res.status(401).json({ error: 'Missing or invalid authorization header.' });

    const token = authHeader.split(' ')[1];
    try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user) throw error || new Error('Invalid token');
        req.user = user;
        next();
    } catch (err) {
        console.error(err);
        res.status(401).json({ error: 'Unauthorized' });
    }
}

// 3.2.6 GET /api/cart (protected)
app.get('/api/cart', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('carts')
            .select('*')
            .eq('user_id', req.user.id);
        if (error) throw error;
        res.json({ data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch cart.' });
    }
});

// 3.2.7 POST /api/cart (protected)
app.post('/api/cart', authenticateToken, async (req, res) => {
    const { product_version_id, quantity, size } = req.body;
    try {
        const { data, error } = await supabaseAdmin
            .from('carts')
            .insert({
                user_id: req.user.id,
                product_version_id,
                quantity,
                size,
            })
            .select();
        if (error) throw error;
        res.status(201).json({ data: data[0] });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: 'Failed to add to cart.' });
    }
});

// 3.2.8 DELETE /api/cart/:cartId (protected)
app.delete('/api/cart/:cartId', authenticateToken, async (req, res) => {
    const { cartId } = req.params;
    try {
        // Ensure that this cart item belongs to the authenticated user
        const { data: existing, error: selectError } = await supabaseAdmin
            .from('carts')
            .select('user_id')
            .eq('id', cartId)
            .single();
        if (selectError || !existing) throw selectError || new Error('Not found');
        if (existing.user_id !== req.user.id)
            return res.status(403).json({ error: 'Forbidden' });

        const { error: deleteError } = await supabaseAdmin
            .from('carts')
            .delete()
            .eq('id', cartId);
        if (deleteError) throw deleteError;
        res.json({ message: 'Deleted from cart.' });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: 'Failed to delete cart item.' });
    }
});

// 3.2.9 POST /api/like (protected)
app.post('/api/like', authenticateToken, async (req, res) => {
    const { product_version_id } = req.body;
    const userId = req.user.id;
    try {
        // Check if a like already exists
        const { data: existingArr, error: checkError } = await supabaseAdmin
            .from('likes')
            .select('*')
            .eq('user_id', userId)
            .eq('product_version_id', product_version_id);
        if (checkError) throw checkError;

        if (existingArr.length > 0) {
            // If it exists, remove (toggle off)
            const { error: deleteError } = await supabaseAdmin
                .from('likes')
                .delete()
                .eq('user_id', userId)
                .eq('product_version_id', product_version_id);
            if (deleteError) throw deleteError;
            return res.json({ message: 'Unliked.' });
        } else {
            // Otherwise, insert (toggle on)
            const { data: like, error: insertError } = await supabaseAdmin
                .from('likes')
                .insert({ user_id: userId, product_version_id })
                .select();
            if (insertError) throw insertError;
            return res.status(201).json({ data: like[0] });
        }
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: 'Failed to toggle like.' });
    }
});

// 3.2.10 GET /api/like/:userId
app.get('/api/like/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const { data, error } = await supabaseAdmin
            .from('likes')
            .select('product_version_id')
            .eq('user_id', userId);
        if (error) throw error;
        res.json({ data: data.map((row) => row.product_version_id) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch likes.' });
    }
});

// 3.2.11 GET /api/reviews/:versionId
app.get('/api/reviews/:versionId', async (req, res) => {
    const { versionId } = req.params;
    try {
        const { data, error } = await supabaseAdmin
            .from('reviews')
            .select('*')
            .eq('product_version_id', versionId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json({ data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch reviews.' });
    }
});

// 3.2.12 POST /api/reviews (protected)
app.post('/api/reviews', authenticateToken, async (req, res) => {
    const { product_version_id, rating, comment } = req.body;
    try {
        const { data, error } = await supabaseAdmin
            .from('reviews')
            .insert({
                user_id: req.user.id,
                product_version_id,
                rating,
                comment,
            })
            .select();
        if (error) throw error;
        res.status(201).json({ data: data[0] });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: 'Failed to add review.' });
    }
});

// 3.2.13 POST /api/upload (protected)
app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const userId = req.user.id;
    const { originalname, buffer } = req.file;

    // Generate a unique key for this file, e.g. userId/timestamp_originalname
    const timestamp = Date.now();
    const key = `${userId}/${timestamp}_${originalname}`;

    try {
        // Upload to R2
        await s3
            .putObject({
                Bucket: R2_BUCKET,
                Key: key,
                Body: buffer,
                ContentType: req.file.mimetype,
                ACL: 'public-read', // ensures public read access
            })
            .promise();

        // Construct the public URL
        const publicUrl = `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${key}`;
        res.status(201).json({ key, publicUrl });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to upload to R2.' });
    }
});

// ─── START SERVER ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🛡️  Server running on port ${PORT}`);
});
