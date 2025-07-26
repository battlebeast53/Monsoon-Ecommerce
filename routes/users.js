const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const passport = require('passport');
const bcrypt = require('bcryptjs');

const User = require('../models/user');
const Order = require('../models/order');

// GET Register Page
router.get('/register', (req, res) => {
  res.render('register', { title: 'Register' });
});

// POST Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, username, password, password2, mobile } = req.body;

    if (password !== password2) {
      req.flash('danger', 'Password and Confirm Password do not match');
      return res.redirect('/users/register');
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      req.flash('danger', 'Username already exists');
      return res.redirect('/users/register');
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      mobile,
      username,
      password: hash,
      admin: 0
    });

    await newUser.save();
    req.flash('success', 'You are now registered!');
    res.redirect('/users/login');

  } catch (err) {
    console.error("Error in POST /register:", err);
    req.flash('danger', 'Registration failed due to server error.');
    res.redirect('/users/register');
  }
});

// GET Login
router.get('/login', (req, res) => {
  if (res.locals.user) {
    req.flash('info', 'You are already logged in');
    return res.redirect('/products');
  }
  res.render('login', { title: 'Log In' });
});

// POST Login
router.post(
  '/login',
  passport.authenticate('local', {
    failureRedirect: '/users/login',
    failureFlash: 'Invalid username or password...'
  }),
  (req, res) => {
    console.log(req.flash('error'));
    res.cookie('username', req.body.username, { maxAge: 900000, httpOnly: true });

    req.flash('success', 'Login successful!');
    if (req.user.admin) {
      return res.redirect('/admin/dashboard');
    } else {
      return res.redirect('/products');
    }
  }
);

// GET Logout
router.get('/logout', async function(req,res){
   req.logOut();
    res.clearCookie('username')
   req.flash('success',"Successfully logged out");
   res.redirect('/products');
});


// GET My Orders
router.get('/orders', async (req, res) => {
  if (!req.isAuthenticated()) {
    req.flash('danger', 'Please login to view orders');
    return res.redirect('/users/login');
  }

  try {
    const orders = await Order.find({ user: req.user._id }).populate('items.product');
    res.render('orders', { title: "My Orders", orders });
  } catch (err) {
    console.error("Error fetching user orders", err);
    req.flash('danger', 'Could not load your orders.');
    res.redirect('/products');
  }
});

module.exports = router;
