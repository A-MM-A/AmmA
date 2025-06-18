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
    // router.get('/', async (req, res) => {
    //   try {
    //     // Fetch all products
    //     const { data: products, error: productsError } = await supabaseAdmin
    //       .from('products')
    //       .select('*')
    //       .order('id', { ascending: true });

    //     if (productsError) throw productsError;

    //     // For each product, fetch its versions
    //     const productsWithVersions = await Promise.all(
    //       products.map(async (product) => {
    //         const { data: versions, error: versionsError } = await supabaseAdmin
    //           .from('product_versions')
    //           .select('*')
    //           .eq('product_id', product.id)
    //           .order('id', { ascending: true });
    //         if (versionsError) throw versionsError;
    //         // Map DB field names to exactly what script.js expects:
    //         const formattedVersions = versions.map(v => ({
    //           versionSerial: v.versionSerial,
    //           title: v.title,
    //           priceValue: v.priceValue,
    //           sizes: v.sizes,
    //           imageKey: v.imageKey,
    //           description: v.description,
    //           inStock: v.inStock
    //         }));
    //         return {
    //           baseSerial: product.baseSerial,
    //           category: product.category,
    //           subCategory: product.subCategory,
    //           versions: formattedVersions
    //         };
    //       })
    //     );

    //     res.json({ data: productsWithVersions });
    //   } catch (err) {
    //     console.error(err);
    //     res.status(500).json({ error: 'Failed to fetch products.' });
    //   }

    // try {
    //   // 1) pull all products
    //   const { data: products, error: productsError } = await supabaseAdmin
    //     .from('products')
    //     .select('*')
    //     .order('id', { ascending: true });
    //   if (productsError) throw productsError;

    //   // 2) for each product fetch its versions and shape the object
    //   const productsWithVersions = await Promise.all(
    //     products.map(async (product) => {
    //       const { data: versions, error: versionsError } = await supabaseAdmin
    //         .from('product_versions')
    //         .select('*')
    //         .eq('product_id', product.id);
    //       if (versionsError) throw versionsError;

    //       const formattedVersions = versions.map(v => ({
    //         versionSerial: v.versionSerial,
    //         title: v.title,
    //         priceValue: v.priceValue,
    //         sizes: v.sizes,
    //         imageKey: v.imageKey,
    //         description: v.description,
    //         inStock: v.inStock
    //       }));

    //       // **return** each shaped product object
    //       return {
    //         baseSerial: product.baseSerial,
    //         category: product.category,
    //         subCategory: product.subCategory,
    //         versions: formattedVersions
    //       };
    //     })
    //   );


    router.get('/', async (req, res) => {
        try {
            // 1) fetch all base_items (we’ll parse category codes in the frontend)
            const { data: baseItems, error: baseErr } = await supabaseAdmin
                .from('base_items')
                .select('id, base_serial, description')
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
                .select('id, base_serial, description')
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