const express = require('express');
const router = express.Router();
const Product = require('../models/product');

// Homepage route
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({}).limit(3); // or .limit(6) for featured
    res.render('home', {
      title: 'Welcome to Monsoon Gruhudyog',
      products: products
    });
  } catch (err) {
    console.error("Error loading homepage products:", err);
    res.redirect('/');
  }
});



module.exports = router;
