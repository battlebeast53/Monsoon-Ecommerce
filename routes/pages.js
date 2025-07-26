const express = require('express');
const router = express.Router();
const Pages = require('../models/page');

/*
 * GET /
 */
router.get('/', async function (req, res) {
  try {
    const page = await Pages.findOne({ slug: 'home' });
    if (!page) {
      return res.status(404).send('Page not found');
    }
    res.render('index', {
      title: page.title,
      content: page.content,
    });
  } catch (err) {
    console.log("error in router.get('/') " + err);
    res.status(500).send('Server error');
  }
});

/*
 * GET a page by slug
 */
router.get('/:slug', async function (req, res) {
  const slug = req.params.slug;
  try {
    const page = await Pages.findOne({ slug: slug });
    if (!page) {
      return res.redirect('/');
    }
    res.render('index', {
      title: page.title,
      content: page.content,
    });
  } catch (err) {
    console.log("error in pages.js in /:slug " + err);
    res.status(500).send('Server error');
  }
});



module.exports = router;
