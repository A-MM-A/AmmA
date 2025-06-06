/**
 * backend/routes/admin.js
 * ───────────────────────
 * Handles:
 *   POST /api/admin
 *   POST /api/admin
 *   POST /api/admin
 */

const express = require('express');
module.exports = (supabaseAdmin) => {
    const router = express.Router();

    router.post('/admin/items', authenticateAdmin, async (req, res) => {
        try {
            const { baseSerial, category, subCategory } = req.body;
            const { data, error } = await supabase
                .from('products')
                .insert({
                    baseSerial,
                    category,
                    subCategory,
                    dateAdded: new Date().toISOString().split('T')[0], // or let default
                    inStock: true
                })
                .select()
                .single();
            if (error) throw error;
            res.status(201).json({ data });
        } catch (err) {
            console.error(err);
            res.status(400).json({ error: 'Failed to create item.' });
        }
    });

    router.get('/admin/items', authenticateAdmin, async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('id', { ascending: true });
            if (error) throw error;
            res.json({ data });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to list items.' });
        }
    });

    router.put('/admin/items/:id', authenticateAdmin, async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            const updates = req.body; // e.g. { baseSerial, category, subCategory }
            const { data, error } = await supabase
                .from('products')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            res.json({ data });
        } catch (err) {
            console.error(err);
            res.status(400).json({ error: 'Failed to update item.' });
        }
    });

    router.delete('/admin/items/:id', authenticateAdmin, async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            // Let ON DELETE CASCADE handle product_versions removal
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) throw error;
            res.json({ message: 'Item deleted.' });
        } catch (err) {
            console.error(err);
            res.status(400).json({ error: 'Failed to delete item.' });
        }
    });


    router.post('/admin/versions', authenticateAdmin, async (req, res) => {
        try {
            const { product_id, versionSerial, title, priceValue, sizes, imageKey, description, inStock } = req.body;
            const { data, error } = await supabase
                .from('product_versions')
                .insert({
                    product_id,
                    versionSerial,
                    title,
                    priceValue,
                    sizes,
                    imageKey,
                    description,
                    inStock,
                    dateAdded: new Date().toISOString().split('T')[0]
                })
                .select()
                .single();
            if (error) throw error;
            res.status(201).json({ data });
        } catch (err) {
            console.error(err);
            res.status(400).json({ error: 'Failed to create version.' });
        }
    });

    router.get('/admin/items/:itemId/versions', authenticateAdmin, async (req, res) => {
        try {
            const itemId = parseInt(req.params.itemId, 10);
            const { data, error } = await supabase
                .from('product_versions')
                .select('*')
                .eq('product_id', itemId)
                .order('id', { ascending: true });
            if (error) throw error;
            res.json({ data });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to list versions.' });
        }
    });

    router.put('/admin/versions/:id', authenticateAdmin, async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            const updates = req.body;
            const { data, error } = await supabase
                .from('product_versions')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            res.json({ data });
        } catch (err) {
            console.error(err);
            res.status(400).json({ error: 'Failed to update version.' });
        }
    });

    router.delete('/admin/versions/:id', authenticateAdmin, async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            const { error } = await supabase.from('product_versions').delete().eq('id', id);
            if (error) throw error;
            res.json({ message: 'Version deleted.' });
        } catch (err) {
            console.error(err);
            res.status(400).json({ error: 'Failed to delete version.' });
        }
    });

    router.post('/admin/categories', authenticateAdmin, async (req, res) => {
        try {
            const { name, letter } = req.body;
            const { data, error } = await supabase
                .from('categories')
                .insert({ name, letter })
                .select()
                .single();
            if (error) throw error;
            res.status(201).json({ data });
        } catch (err) {
            console.error(err);
            res.status(400).json({ error: 'Failed to create category.' });
        }
    });

    router.get('/admin/categories', authenticateAdmin, async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('id', { ascending: true });
            if (error) throw error;
            res.json({ data });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to list categories.' });
        }
    });

    router.put('/admin/categories/:id', authenticateAdmin, async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            const updates = req.body;
            const { data, error } = await supabase
                .from('categories')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            res.json({ data });
        } catch (err) {
            console.error(err);
            res.status(400).json({ error: 'Failed to update category.' });
        }
    });

    router.delete('/admin/categories/:id', authenticateAdmin, async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            const { error } = await supabase.from('categories').delete().eq('id', id);
            if (error) throw error;
            res.json({ message: 'Category deleted.' });
        } catch (err) {
            console.error(err);
            res.status(400).json({ error: 'Failed to delete category.' });
        }
    });






    return router;
};
