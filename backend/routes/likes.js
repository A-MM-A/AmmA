/**
 * backend/routes/likes.js
 * ────────────────────────
 * Handles:
 *   POST /api/like         (toggle like/unlike by full_serial )
 *   GET  /api/like/:userId  (list liked full_serial for that user)
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


  // POST /api/like → toggle like/unlike
  router.post('/', authenticateUser, async (req, res) => {
    try {
      console.log("📥 LIKE BODY:", req.body);
      const userId = req.user.id;
      // const { product_version_id, products, serial } = req.body;
      const { full_serial } = req.body;  // <— expect { full_serial: 'FMH00101' }

      // Check existing like
      const { data: existingArr, error: chkErr } = await supabaseAdmin
        .from('likes')
        .select('*')
        .eq('user_id', userId)
        .eq('full_serial', full_serial);
      if (chkErr) throw chkErr;


      // if (existingArr.length > 0) {
      //   // Unlike
      //   const { error: delErr } = await supabaseAdmin
      //     .from('likes')
      //     .delete()
      //     .eq('user_id', userId)
      //     .eq('product_version_id', product_version_id)
      //     .eq('products', products)
      //     .eq('serial', serial);
      //   if (delErr) throw delErr;
      //   return res.json({ message: 'Unliked.' });
      // } else {
      //   // Like
      //   const { data, error: insErr } = await supabaseAdmin
      //     .from('likes')
      //     .insert({ user_id: userId, product_version_id, products, serial })
      //     .select()
      //     .single();
      //   console.log("📝 LIKE INSERT RESULT:", { data, insErr });
      //   if (insErr) throw insErr;

      //   return res.status(201).json({ data });
      // }

      if (!existingArr.length) {
        // insert new like
        await supabaseAdmin.from('likes').insert({ user_id: userId, full_serial });
        return res.json({ message: 'Liked.' });
      } else {
        // remove existing like
        await supabaseAdmin
          .from('likes')
          .delete()
          .eq('user_id', userId)
          .eq('full_serial', full_serial);
        return res.json({ message: 'Unliked.' });
      }





    } catch (err) {
      console.error(err);
      res.status(400).json({ error: err.message || err.toString() });
    }
  });




  // GET /api/like/:userId → get array of version IDs
  router.get('/:userId', authenticateUser, async (req, res) => {

    try {
      const { userId } = req.params;

      const { data, error } = await supabaseAdmin
        .from('likes')
        .select('full_serial')
        .eq('user_id', userId);

      if (error) throw error;
      res.json({ data: data.map(r => r.full_serial) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load likes.' });
    }
  });


  return router;
};