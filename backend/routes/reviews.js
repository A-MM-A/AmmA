/**
 * backend/routes/reviews.js
 * ──────────────────────────
 * Handles:
 *   GET  /api/reviews/:versionId  (public)
 *   POST /api/reviews             (authenticated)
 */

const express = require('express');
module.exports = (supabaseAdmin) => {
  const router = express.Router();

  // GET /api/reviews/:versionId → public fetch reviews for a version
  router.get('/reviews/:versionId', async (req, res) => {
    try {
      const versionId = parseInt(req.params.versionId, 10);
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_version_id', versionId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      res.json({ data });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load reviews.' });
    }
  });


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

  // POST /api/reviews → add a new review
  router.post('/reviews', authenticateUser, async (req, res) => {
    try {
      const userId = req.user.id;
      const { product_version_id, rating, comment } = req.body;
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          user_id: userId,
          product_version_id,
          rating,
          comment
        })
        .select()
        .single();
      if (error) throw error;
      res.status(201).json({ data });
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: 'Failed to add review.' });
    }
  });


  return router;
};
