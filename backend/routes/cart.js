/**
 * backend/routes/cart.js
 * ───────────────────────
 * Handles:
 *   GET /api/cart         (authenticated)
 *   POST /api/cart        (authenticated)
 *   DELETE /api/cart/:cartId  (authenticated)
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

  // GET /api/cart → list items for the logged-in user
  router.get('/cart', authenticateUser, async (req, res) => {
    try {
      const userId = req.user.id;
      const { data, error } = await supabase
        .from('carts')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      res.json({ data });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load cart.' });
    }
  });

  // POST /api/cart → add item to cart
  router.post('/cart', authenticateUser, async (req, res) => {
    try {
      const userId = req.user.id;
      const { product_version_id, product_id, serial, title, base_price, total_price, quantity, size } = req.body;
      const { data, error } = await supabase
        .from('carts')
        .insert({
          user_id: userId,
          product_version_id,
          product_id,
          serial,
          title,
          base_price,
          total_price,
          quantity,
          size
        })
        .select()
        .single();
      if (error) throw error;
      res.status(201).json({ data });
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: 'Failed to add to cart.' });
    }
  });

  // PUT /api/cart
  router.put('/cart/:cartId', authenticateUser, async (req, res) => {
    try {
      const userId = req.user.id;
      const cartId = parseInt(req.params.cartId, 10);
      const { quantity } = req.body;

      // Verify ownership:
      const { data: existing, error: selErr } = await supabase
        .from('carts')
        .select('user_id')
        .eq('id', cartId)
        .single();
      if (selErr) throw selErr;
      if (existing.user_id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { data, error } = await supabase
        .from('carts')
        .update({ quantity })
        .eq('id', cartId)
        .select()
        .single();
      if (error) throw error;
      res.json({ data });
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: 'Failed to update cart.' });
    }
  });


  // DELETE /api/cart/:cartId → remove item
  router.delete('/cart/:cartId', authenticateUser, async (req, res) => {
    try {
      const userId = req.user.id;
      const cartId = parseInt(req.params.cartId, 10);

      // Verify ownership:
      const { data: existing, error: selErr } = await supabase
        .from('carts')
        .select('user_id')
        .eq('id', cartId)
        .single();
      if (selErr) throw selErr;
      if (existing.user_id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { error } = await supabase
        .from('carts')
        .delete()
        .eq('id', cartId);
      if (error) throw error;
      res.json({ message: 'Removed from cart.' });
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: 'Failed to remove cart item.' });
    }
  });

  return router;
};
