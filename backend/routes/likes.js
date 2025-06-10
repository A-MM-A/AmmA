/**
 * backend/routes/likes.js
 * ────────────────────────
 * Handles:
 *   POST /api/like         (toggle like/unlike; authenticated)
 *   GET  /api/like/:userId  (list liked version IDs for that user)
 */

const express = require('express');
module.exports = (supabaseAdmin) => {
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

  // POST /api/like → toggle like/unlike
  router.post('/like', authenticateUser, async (req, res) => {
    try {
      console.log("📥 LIKE BODY:", req.body);
      const userId = req.user.id;
      const { product_version_id, products, serial } = req.body;

      // Check existing like
      const { data: existingArr, error: chkErr } = await supabaseAdmin
        .from('likes')
        .select('*')
        .eq('user_id', userId)
        .eq('product_version_id', product_version_id)
        .eq('products', products)
        .eq('serial', serial);
      if (chkErr) throw chkErr;

      if (existingArr.length > 0) {
        // Unlike
        const { error: delErr } = await supabaseAdmin
          .from('likes')
          .delete()
          .eq('user_id', userId)
          .eq('product_version_id', product_version_id)
          .eq('products', products)
          .eq('serial', serial);
        if (delErr) throw delErr;
        return res.json({ message: 'Unliked.' });
      } else {
        // Like
        const { data, error: insErr } = await supabaseAdmin
          .from('likes')
          .insert({ user_id: userId, product_version_id, products, serial })
          .select()
          .single();
          console.log("📝 LIKE INSERT RESULT:", { data, insErr });
        if (insErr) throw insErr;
        return res.status(201).json({ data });
      }
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: err.message || err.toString() });
    }
  });


  // GET /api/like/:userId → get array of version IDs
  router.get('/like/:userId', async (req, res) => {
    try {
      const userId = req.params.userId;
      const { data, error } = await supabase
        .from('likes')
        .select('product_version_id')
        .eq('user_id', userId);
      if (error) throw error;
      res.json({ data: data.map(r => r.product_version_id) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load likes.' });
    }
  });


  return router;
};