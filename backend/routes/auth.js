/**
 * backend/routes/auth.js
 * ───────────────────────
 * Handles:
 *   POST /api/auth/register
 *   POST /api/auth/login
 *   POST /api/auth/callback
 */

const express = require('express');
module.exports = (supabaseAdmin) => {
  const router = express.Router();

  // POST /api/auth/register
  router.post('/register', async (req, res) => {
    const { email, password } = req.body;
    try {
      const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
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

  // POST /api/auth/login
  router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      // Return the session object to client
      res.json({ session: data.session });
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: err.message });
    }
  });

  // POST /api/auth/callback
  router.post('/callback', async (req, res) => {
    // Supabase’s JS client handles OAuth callbacks client-side.
    // If you want server-side code to parse the code and exchange it:
    //   const { code } = req.query;
    //   const { data: { session }, error } = await supabaseAdmin.auth.exchangeCodeForSession(code);
    res.json({ message: 'OAuth callback endpoint (handled client-side).' });
  });

  return router;
};
