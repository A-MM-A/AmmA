/**
 * backend/routes/cart.js
 * ───────────────────────
 * Handles:
 *   POST   /api/cart         → add item snapshot to cart
 *   GET    /api/cart         → list all cart snapshots
 *   PUT    /api/cart/:cartId → update quantity/size
 *   DELETE /api/cart/:cartId → remove item from cart
 */

const express = require('express');
module.exports = (supabaseAdmin) => {
  const router = express.Router();

  // Middleware: Authenticate JWT
  async function authenticateUser(req, res, next) {
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

  // POST /api/cart → add item to cart
  router.post('/', authenticateUser, async (req, res) => {
    try {
      const userId = req.user.id;

      // const { product_version_id, product_id, serial, title, base_price, total_price, quantity, size } = req.body;
      const {
        full_serial,    // <— e.g. 'FMH00101'
        title,          // <— version title snapshot
        size,           // <— user‑selected size
        quantity,       // <— user‑selected quantity
        unit_price,     // <— snapshot price per unit
        seller_id       // <— seller reference
      } = req.body;

      const { data, error } = await supabase
        .from('carts')

        // .insert({
        //   user_id: userId,
        //   product_version_id,
        //   product_id,
        //   serial,
        //   title,
        //   base_price,
        //   total_price,
        //   quantity,
        //   size
        // })
        // .select()
        // .single();

        .insert({
          user_id: userId,
          full_serial,
          title,
          size,
          quantity,
          unit_price,
          seller_id
        });

      if (error) throw error;
      res.status(201).json({ data });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to add to cart.' });
    }
  });



  // GET /api/cart → list items for the logged-in user
  router.get('/', authenticateUser, async (req, res) => {
    try {
      const userId = req.user.id;

      const { data, error } = await supabase
        .from('carts')
        // .select('*')
        .select(`
          id,
          full_serial,
          title,
          size,
          quantity,
          unit_price,
          total_price,
          seller_id
        `)
        .eq('user_id', userId);


      if (error) throw error;
      res.json({ data });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load cart.' });
    }
  });


  // PUT /api/cart
  router.put('/:cartId', authenticateUser, async (req, res) => {
    try {
      const userId = req.user.id;

      const cartId = parseInt(req.params.cartId, 10);

      const { quantity, size } = req.body;

      // Verify ownership:
      const { data: existing, error: selErr } = await supabaseAdmin
        .from('carts')
        .select('user_id')
        .eq('id', cartId)
        .single();
      if (selErr) throw selErr;
      if (existing.user_id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { data, error } = await supabaseAdmin
        .from('carts')
        .update({ quantity, size })
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
  router.delete('/:cartId', authenticateUser, async (req, res) => {
    try {
      const userId = req.user.id;

      const cartId = parseInt(req.params.cartId, 10);

      // Verify ownership:
      const { data: existing, error: selErr } = await supabaseAdmin
        .from('carts')
        .select('user_id')
        .eq('id', cartId)
        .single();
      if (selErr) throw selErr;
      if (existing.user_id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { error } = await supabaseAdmin
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