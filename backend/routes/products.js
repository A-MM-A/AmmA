/**
 * backend/routes/products.js
 * ───────────────────────────
 * Handles:
 *   GET /api/products
 *   GET /api/products/:baseSerial
 */

const express = require('express');
module.exports = (supabaseAdmin) => {
  const router = express.Router();

  // GET /api/products  → all products + nested versions
  router.get('/', async (req, res) => {
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
          // Map DB field names to exactly what script.js expects:
          const formattedVersions = versions.map(v => ({
            versionSerial: v.versionSerial,
            title: v.title,
            priceValue: v.priceValue,
            sizes: v.sizes,
            imageKey: v.imageKey,
            description: v.description,
            inStock: v.inStock
          }));
          return {
            baseSerial: p.baseSerial,
            category: p.category,
            subCategory: p.subCategory,
            versions: formattedVersions
          };
        })
      );

      res.json({ data: productsWithVersions });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch products.' });
    }
  });

  // GET /api/products/:baseSerial → a single product + its versions
  router.get('/:baseSerial', async (req, res) => {
    try {
      const baseSerial = req.params.baseSerial;
      // 1) Fetch product row by baseSerial
      const { data: prodArr, error: prodErr } = await supabase
        .from('products')
        .select('*')
        .eq('baseSerial', baseSerial)
        .limit(1);
      if (prodErr) throw prodErr;
      if (prodArr.length === 0) return res.status(404).json({ error: 'Product not found.' });

      const product = prodArr[0];
      // 2) Fetch versions
      const { data: versions, error: verErr } = await supabase
        .from('product_versions')
        .select('*')
        .eq('product_id', product.id)
        .order('id', { ascending: true });
      if (verErr) throw verErr;

      // Format exactly for frontend
      const formattedVersions = versions.map(v => ({
        versionSerial: v.versionSerial,
        title: v.title,
        priceValue: v.priceValue,
        sizes: v.sizes,
        imageKey: v.imageKey,
        description: v.description,
        inStock: v.inStock
      }));

      res.json({
        data: {
          baseSerial: product.baseSerial,
          category: product.category,
          subCategory: product.subCategory,
          versions: formattedVersions
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load product.' });
    }
  });


  router.get('/versions/:versionId', async (req, res) => {
    try {
      const versionId = parseInt(req.params.versionId, 10);
      const { data: versions, error } = await supabase
        .from('product_versions')
        .select('*')
        .eq('id', versionId)
        .single();
      if (error) throw error;
      res.json({ data: versions });
    } catch (err) {
      console.error(err);
      res.status(404).json({ error: 'Version not found.' });
    }
  });

  return router;
};