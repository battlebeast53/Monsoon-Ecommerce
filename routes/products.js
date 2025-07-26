const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const fs = require('fs-extra');
const auth = require('../config/auth');
const isUser = auth.isUser;

// Get models
const Product = require('../models/product');
const Category = require('../models/category');

/*
 * GET all products 
 */
router.get('/', async function (req, res) {
    try {
        console.log(req.cookies.username);
        const products = await Product.find({});
        let user = req.user || null;
        res.render('all_products', {
            title: 'All products',
            products: products,
            user
        });
    } catch (err) {
        console.error("Error in GET /products:", err);
        res.status(500).send('Server error');
    }
});

/*
 * GET products by category
 */
router.get('/:category', async function (req, res) {
    const categorySlug = req.params.category;
    try {
        const c = await Category.findOne({ slug: categorySlug });
        if (!c) return res.status(404).send('Category not found');

        const products = await Product.find({ category: categorySlug });

        res.render('cat_products', {
            title: c.title,
            products: products
        });
    } catch (err) {
        console.error("Error in GET /:category:", err);
        res.status(500).send('Server error');
    }
});

/*
 * GET product details
 */
router.get('/:category/:product', async function (req, res) {
    const productSlug = req.params.product;
    const loggedIn = req.isAuthenticated ? req.isAuthenticated() : false;

    try {
        const product = await Product.findOne({ slug: productSlug });
        if (!product) return res.status(404).send('Product not found');

        const galleryDir = `public/product_images/${product._id}/gallery`;
        let galleryImages = [];

        // Check if gallery directory exists before reading
        if (await fs.pathExists(galleryDir)) {
            galleryImages = await fs.readdir(galleryDir);
        }

        res.render('product', {
            title: product.title,
            p: product,
            galleryImages: galleryImages,
            loggedIn: loggedIn
        });
    } catch (err) {
        console.error("Error in GET /:category/:product:", err);
        res.status(500).send('Server error');
    }
});

module.exports = router;
