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

    // ---------------------------------------------------------------------------------------------------------------------------------------------- 
    //                                                                 Adding an item version
    // ---------------------------------------------------------------------------------------------------------------------------------------------- 

    // POST /api/products/versions → Add a new item version
    router.post('/versions', async (req, res) => {
        try {
            const payload = req.body;

            // ✅ Validate required fields
            const requiredFields = ['base_item_id', 'version_number', 'title', 'price', 'seller_id'];
            for (const field of requiredFields) {
                if (!payload[field]) {
                    return res.status(400).json({ error: `Missing required field: ${field}` });
                }
            }

            // ✅ Insert into item_versions table
            const { data, error } = await supabaseAdmin
                .from('item_versions')
                .insert([payload])
                .select();
            if (error) {
                console.error('❌ Supabase insert error:', error);
                // return the full PostgREST error object to your client:
                return res
                    .status(400)
                    .json({ error: error.message, code: error.code, details: error.details });
            }
            res.status(201).json({
                message: 'Item version added successfully',
                data: data[0]
            });


        } catch (err) {
            console.error('❌ Failed to insert item version:', err);
            res.status(500).json({ error: err.message || 'Failed to insert item version.' });
        }
    });

    // GET /api/products/base-items
    // → returns all base_items as [{ id, base_serial }, …]
    router.get('/base-items', async (req, res) => {
        try {
            const { data, error } = await supabaseAdmin
                .from('base_items')
                .select('id, base_serial, description')
                .order('id', { ascending: true });

            if (error) {
                console.error('❌ Error fetching base_items:', error);
                return res.status(400).json({ error: error.message });
            }

            // send back an array of { id, base_serial }
            res.json({ items: data });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to load base_items.' });
        }
    });


    // GET /api/products/versions/base/:baseItemId
    // → returns an array of all version_number (as integers) for that base_item_id
    router.get(
        '/versions/base/:baseItemId',
        async (req, res) => {
            try {
                const baseItemId = Number(req.params.baseItemId);

                // fetch only version_number column
                const { data, error } = await supabaseAdmin
                    .from('item_versions')
                    .select('version_number')
                    .eq('base_item_id', baseItemId);

                if (error) {
                    console.error('❌ Error fetching versions:', error);
                    return res.status(400).json({ error: error.message });
                }

                // map to array of Numbers
                const versionNumbers = data.map((row) =>
                    Number(row.version_number)
                );

                res.json({ versions: versionNumbers });
            } catch (err) {
                console.error(err);
                res.status(500).json({ error: 'Failed to load versions.' });
            }
        }
    );

    // GET /api/sellers
    // → returns all sellers as [{ id, name }, …]
    router.get('/sellers', async (req, res) => {
        try {
            const { data, error } = await supabaseAdmin
                .from('sellers')
                .select('id, name')
                .order('id', { ascending: true });

            if (error) {
                console.error('❌ Error fetching sellers:', error);
                return res.status(400).json({ error: error.message });
            }

            res.json({ sellers: data });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to load sellers.' });
        }
    });



    // ---------------------------------------------------------------------------------------------------------------------------------------------- 
    //                                                     Editting & deleting an item version
    // ---------------------------------------------------------------------------------------------------------------------------------------------- 

    // GET /api/products/versions/serial/:fullSerial -> gets the item using full serial
    router.get('/versions/serial/:fullSerial', async (req, res) => {
        try {
            const fullSerial = req.params.fullSerial;
            const { data, error } = await supabaseAdmin
                .from('item_versions')
                .select(`
        full_serial, title, price, sizes, material, weight,
        other_attrs, in_stock, profit_margin, seller_id, available
      `)
                .eq('full_serial', fullSerial)
                .single();

            if (error) {
                console.error('❌ Version not found:', error);
                return res.status(404).json({ error: 'Version not found' });
            }
            res.json({ version: data });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to fetch version' });
        }
    });

    // PUT /api/products/versions/serial/:fullSerial -> edits the item 
    router.put('/versions/serial/:fullSerial', async (req, res) => {
        try {
            const fullSerial = req.params.fullSerial;
            const updates = req.body; // expect keys: title, price, sizes, etc.
            const { data, error } = await supabaseAdmin
                .from('item_versions')
                .update(updates)
                .eq('full_serial', fullSerial)
                .select()
                .single();

            if (error) {
                console.error('❌ Failed to update version:', error);
                return res.status(400).json({ error: error.message });
            }
            res.json({ message: 'Updated successfully', version: data });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to update version' });
        }
    });

    router.delete('/versions/serial/:fullSerial', async (req, res) => {
        try {
            const fullSerial = req.params.fullSerial;

            // attempt delete
            const { data, error } = await supabaseAdmin
                .from('item_versions')
                .delete()
                .eq('full_serial', fullSerial)
                .select()           // returns deleted row(s)
                .single();          // expect exactly one

            if (error) {
                console.error('❌ Failed to delete version:', error);
                return res.status(400).json({ error: error.message });
            }
            if (!data) {
                return res.status(404).json({ error: 'Version not found' });
            }

            res.json({ message: 'Deleted successfully', deleted: data });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to delete version' });
        }
    });


    // ---------------------------------------------------------------------------------------------------------------------------------------------- 
    //                                                                 Adding an item
    // ---------------------------------------------------------------------------------------------------------------------------------------------- 



    // GET /api/products/categories
    // → returns all categories as [{ id, code, name }, …]
    router.get('/categories', async (req, res) => {
        try {
            const { data, error } = await supabaseAdmin
                .from('categories')
                .select('id, code, name')
                .order('id', { ascending: true });

            if (error) {
                console.error('❌ Error fetching categories:', error);
                return res.status(400).json({ error: error.message });
            }

            // send back an array of fetched data
            res.json({ items: data });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to load categories.' });
        }
    });


    // GET /api/products/sub_categories
    // → returns all sub_categories as [{ id, category_id, code, name }, …]
    router.get('/sub_categories', async (req, res) => {
        try {
            const { data, error } = await supabaseAdmin
                .from('sub_categories')
                .select('id, category_id, code, name')
                .order('id', { ascending: true });

            if (error) {
                console.error('❌ Error fetching sub_categories:', error);
                return res.status(400).json({ error: error.message });
            }

            // send back an array of fetched data
            res.json({ items: data });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to load sub_categories.' });
        }
    });


    // GET /api/products/third_letters
    // → returns all third_letters as [{ id, category_id, sub_category_id, code, name }, …]
    router.get('/third_letters', async (req, res) => {
        try {
            const { data, error } = await supabaseAdmin
                .from('third_letters')
                .select('id, category_id, sub_category_id, code, name')
                .order('id', { ascending: true });

            if (error) {
                console.error('❌ Error fetching third_letters:', error);
                return res.status(400).json({ error: error.message });
            }

            // send back an array of fetched data
            res.json({ items: data });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to load third_letters.' });
        }
    });


    // GET /api/products/base-items/codes/:categoryId/:subCategoryId/:thirdLetterId
    router.get(
        '/base-items/codes/:categoryId/:subCategoryId/:thirdLetterId',
        async (req, res) => {
            try {
                const categoryId = Number(req.params.categoryId);
                const subCategoryId = Number(req.params.subCategoryId);
                const thirdLetterId = Number(req.params.thirdLetterId);

                const { data, error } = await supabaseAdmin
                    .from('base_items')
                    .select('code_number')
                    .eq('category_id', categoryId)
                    .eq('sub_category_id', subCategoryId)
                    .eq('third_letter_id', thirdLetterId);

                if (error) {
                    console.error('❌ Error fetching codes:', error);
                    return res.status(400).json({ error: error.message });
                }

                // extract just the code_number values
                const codes = data.map(row => Number(row.code_number));

                res.json({ codes });
            } catch (err) {
                console.error(err);
                res.status(500).json({ error: 'Failed to load codes.' });
            }
        }
    );


    // POST /api/products/base-items
    router.post('/base-items', async (req, res) => {
        try {
            const payload = req.body; // { category_id, sub_category_id, third_letter_id, code_number, description }
            // optional: validate each field here …

            const { data, error } = await supabaseAdmin
                .from('base_items')
                .insert([payload])
                .select()
                .single();

            if (error) {
                console.error('❌ Failed to insert base_item:', error);
                return res.status(400).json({ error: error.message });
            }
            res.status(201).json({ message: 'Base item added', item: data });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to add base item' });
        }
    });


    // ---------------------------------------------------------------------------------------------------------------------------------------------- 
    //                                                     Editting & deleting an item 
    // ---------------------------------------------------------------------------------------------------------------------------------------------- 

    // gets the item using full serial
    router.get('/base_items/serial/:fullSerial', async (req, res) => {
        try {
            const fullSerial = req.params.fullSerial;
            const { data, error } = await supabaseAdmin
                .from('base_items')
                .select(`
                  category_id, sub_category_id, third_letter_id,
                  code_number, description, base_serial
                `)
                .eq('base_serial', fullSerial)
                .single();

            if (error) {
                console.error('❌ Item not found:', error);
                return res.status(404).json({ error: 'Item not found' });
            }
            res.json({ items: data });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to fetch item' });
        }
    });

    // editing the item 
    router.put('/base_items/serial/:fullSerial', async (req, res) => {
        try {
            const fullSerial = req.params.fullSerial;
            const updates = req.body; // expect the change
            const { data, error } = await supabaseAdmin
                .from('base_items')
                .update(updates)
                .eq('base_serial', fullSerial)
                .select()
                .single();

            if (error) {
                console.error('❌ Failed to update item:', error);
                return res.status(400).json({ error: error.message });
            }
            res.json({ message: 'Updated successfully', items: data });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to update item' });
        }
    });


    // deleting an item.
    router.delete('/base-items/serial/:fullSerial', async (req, res) => {
        try {
            const fullSerial = req.params.fullSerial;

            // attempt delete
            const { data, error } = await supabaseAdmin
                .from('base_items')
                .delete()
                .eq('base_serial', fullSerial)
                .select()           // returns deleted row(s)
                .single();          // expect exactly one

            if (error) {
                console.error('❌ Failed to delete item:', error);
                return res.status(400).json({ error: error.message });
            }
            if (!data) {
                return res.status(404).json({ error: 'item not found' });
            }

            res.json({ message: 'Deleted successfully', deleted: data });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to delete item' });
        }
    });



    // ---------------------------------------------------------------------------------------------------------------------------------------------- 
    //                                                           Fetching an item for viewing
    // ---------------------------------------------------------------------------------------------------------------------------------------------- 


    // GET /api/products  → all products + nested versions
    router.get('/', async (req, res) => {
        try {
            // 1) fetch all base_items (we’ll parse category codes in the frontend)
            const { data: baseItems, error: baseErr } = await supabaseAdmin
                .from('base_items')
                .select(`
                    id, 
                    category_id, 
                    sub_category_id, 
                    third_letter_id, 
                    code_number, 
                    base_serial, 
                    description
                    `)
                .order('id', { ascending: true });

            if (baseErr) throw baseErr;

            // 2) for each base_item, fetch its available & in-stock versions
            const productsWithVersions = await Promise.all(
                baseItems.map(async (item) => {
                    const { data: versions, error: verErr } = await supabaseAdmin
                        .from('item_versions')
                        .select(`
                          version_number,
                          full_serial,
                          title,
                          price,
                          image_key,
                          sizes,
                          material,
                          weight,
                          other_attrs,
                          in_stock,
                          profit_margin,
                          seller_id,
                          created_at,
                          available
                        `)
                        .eq('base_item_id', item.id)
                        .eq('available', true);
                    if (verErr) throw verErr;

                    // 3) format versions for the frontend
                    const formattedVersions = versions.map(v => ({
                        versionSerial: v.version_number,
                        fullSerial: v.full_serial,
                        title: v.title,
                        priceValue: v.price,
                        imageKey: v.image_key,
                        sizes: v.sizes,
                        material: v.material,
                        weight: v.weight,
                        otherAttrs: v.other_attrs,
                        inStock: v.in_stock,
                        Profit: v.profit_margin,
                        Seller: v.seller_id,
                        timeAdded: v.created_at,
                        available: v.available
                    }));

                    return {
                        baseSerial: item.base_serial,
                        CAT: item.category_id,
                        SUB: item.sub_category_id,
                        THIRD: item.third_letter_id,
                        description: item.description,
                        versions: formattedVersions
                    };
                })
            );




            // 3) once you have the full array, send it in one go
            res.json({ data: productsWithVersions });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to load products.' });
        }

    });




    // GET /api/products/:baseSerial → a single product + its versions
    // router.get('/:baseSerial', async (req, res) => {
    //     try {
    //         const baseSerial = req.params.baseSerial;
    //         // 1) Fetch product row by baseSerial
    //         const { data: prodArr, error: prodErr } = await supabase
    //             .from('products')
    //             .select('*')
    //             .eq('baseSerial', baseSerial)
    //             .limit(1);
    //         if (prodErr) throw prodErr;
    //         if (prodArr.length === 0) return res.status(404).json({ error: 'Product not found.' });

    //         const product = prodArr[0];
    //         // 2) Fetch versions
    //         const { data: versions, error: verErr } = await supabase
    //             .from('product_versions')
    //             .select('*')
    //             .eq('product_id', product.id)
    //             .order('id', { ascending: true });
    //         if (verErr) throw verErr;

    //         // Format exactly for frontend
    //         const formattedVersions = versions.map(v => ({
    //             versionSerial: v.versionSerial,
    //             title: v.title,
    //             priceValue: v.priceValue,
    //             sizes: v.sizes,
    //             imageKey: v.imageKey,
    //             description: v.description,
    //             inStock: v.inStock
    //         }));

    //         res.json({
    //             data: {
    //                 baseSerial: product.baseSerial,
    //                 category: product.category,
    //                 subCategory: product.subCategory,
    //                 versions: formattedVersions
    //             }
    //         });
    //     } catch (err) {
    //         console.error(err);
    //         res.status(500).json({ error: 'Failed to load product.' });
    //     }
    // });

    router.get('/:baseSerial', async (req, res) => {
        try {
            const { baseSerial } = req.params;

            // 1) fetch the base_item by base_serial
            const { data: items, error: itemErr } = await supabaseAdmin
                .from('base_items')
                .select(`
                    id, 
                    category_id, 
                    sub_category_id, 
                    third_letter_id, 
                    code_number, 
                    base_serial, 
                    description
                    `)
                .eq('base_serial', baseSerial)
                .limit(1);
            if (itemErr) throw itemErr;
            if (!items.length) {
                return res.status(404).json({ error: 'Product not found.' });
            }
            const item = items[0];

            // 2) fetch its available & in-stock versions
            const { data: versions, error: verErr } = await supabaseAdmin
                .from('item_versions')
                .select(`
                version_number,
                full_serial,
                title,
                price,
                image_key,
                sizes,
                material,
                weight,
                other_attrs,
                in_stock,
                profit_margin,
                seller_id,
                created_at,
                available
                `)
                .eq('base_item_id', item.id)
                .eq('available', true);

            if (verErr) throw verErr;

            // 3) format for frontend
            const formattedVersions = versions.map(v => ({
                versionSerial: v.version_number,
                fullSerial: v.full_serial,
                title: v.title,
                priceValue: v.price,
                imageKey: v.image_key,
                sizes: v.sizes,
                material: v.material,
                weight: v.weight,
                otherAttrs: v.other_attrs,
                inStock: v.in_stock,
                Profit: v.profit_margin,
                Seller: v.seller_id,
                timeAdded: v.created_at,
                available: v.available
            }));

            res.json({
                data: {
                    baseSerial: item.base_serial,
                    CAT: item.category_id,
                    SUB: item.sub_category_id,
                    THIRD: item.third_letter_id,
                    description: item.description,
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
            const { data: version, error: vErr } = await supabaseAdmin
                .from('item_versions')
                .select(`
                version_number,
                full_serial,
                title,
                price,
                image_key,
                sizes,
                material,
                weight,
                other_attrs,
                in_stock,
                profit_margin,
                seller_id,
                created_at,
                available
                `)
                .eq('id', versionId)

                .single();
            if (vErr) throw vErr;
            res.json({ data: version });
        } catch (err) {
            console.error(err);
            res.status(404).json({ error: 'Version not found.' });
        }
    });

    return router;
};