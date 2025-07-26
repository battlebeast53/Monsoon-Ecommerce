const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Product = require('../models/product');
const Cart = require('../models/cart');
const Order = require('../models/order');
const User = require('../models/user');

// GET add product to cart
router.get('/add/:product', async function (req, res) {
    const slug = req.params.product;
    try {
        const p = await Product.findOne({ slug });

        if (!p) {
            console.log("Product not found");
            return res.redirect('back');
        }

        if (!req.session.cart) {
            req.session.cart = [];
        }

        let existingItem = req.session.cart.find(item => item.title === slug);

        if (existingItem) {
            existingItem.qty++;
        } else {
            req.session.cart.push({
                title: slug,
                qty: 1,
                tt: p.tt,
                price: parseFloat(p.price).toFixed(2),
                image: '/product_images/' + p._id + '/' + p.image
            });

            const cartItem = new Cart({
                title: slug,
                qt: 1,
                price: parseFloat(p.price).toFixed(2),
                image: '/product_images/' + p._id + '/' + p.image,
                username: req.cookies.username
            });

            await cartItem.save();
        }

        req.flash('success', 'Product added');
        res.redirect('back');

    } catch (err) {
        console.error("Error in /add/:product", err);
        res.redirect('/');
    }
});

// GET checkout page
router.get('/checkout', async function (req, res) {
    try {
        const items = await Cart.find({ username: req.cookies.username });
        if (items.length === 0) {
            return res.render('emptycart', { title: "Empty Cart" });
        }
        res.render('checkout', { title: 'CheckOut', cart: items });
    } catch (err) {
        console.log(err);
        res.redirect('/');
    }
});

// GET update product
router.get('/update/:product', async function (req, res) {
    const slug = req.params.product;
    const action = req.query.action;

    try {
        const item = await Cart.findOne({ username: req.cookies.username, title: slug });

        if (!item) return res.redirect('/cart/checkout');

        switch (action) {
            case 'add':
                await Cart.findOneAndUpdate({ _id: item._id }, { qt: item.qt + 1 });
                break;
            case 'remove':
                if (item.qt <= 1) {
                    await Cart.findOneAndDelete({ _id: item._id });
                } else {
                    await Cart.findOneAndUpdate({ _id: item._id }, { qt: item.qt - 1 });
                }
                break;
            case 'clear':
                await Cart.findOneAndDelete({ _id: item._id });
                break;
            default:
                console.log("Invalid action on update");
                break;
        }

        req.flash('success', 'Cart updated');
        res.redirect('/cart/checkout');

    } catch (err) {
        console.error("Error in /update/:product", err);
        res.redirect('/');
    }
});

// GET clear cart
router.get('/clear', async function (req, res) {
    try {
        await Cart.deleteMany({ username: req.cookies.username });
        delete req.session.cart;
        req.flash('success', 'Cart cleared');
        res.redirect('/cart/checkout');
    } catch (err) {
        console.error("Error clearing cart", err);
        res.redirect('/');
    }
});

// GET buynow
// router.get('/buynow', async function (req, res) {
//     try {
//         const cartItems = await Cart.find({ username: req.cookies.username });

//         for (let item of cartItems) {
//             const product = await Product.findOne({ slug: item.title });

//             if (product) {
//                 const updatedStock = product.tt - item.qt;
//                 await Product.findOneAndUpdate({ slug: item.title }, { tt: updatedStock });
//             }
//         }

//         await Cart.deleteMany({ username: req.cookies.username });
//         delete req.session.cart;
//         res.sendStatus(200);

//     } catch (err) {
//         console.error("Error in /buynow", err);
//         res.sendStatus(500);
//     }
// });

// router.get('/buynow', async function (req, res) {
//   try {
//     const cartItems = await Cart.find({ username: req.cookies.username });

//     if (!cartItems || cartItems.length === 0) {
//       return res.status(400).send("Cart is empty");
//     }

//     const user = await User.findOne({ username: req.cookies.username });
//     if (!user) {
//       return res.status(401).send("User not found");
//     }

//     let totalAmount = 0;
//     const items = [];

//     for (let item of cartItems) {
//       const product = await Product.findOne({ slug: item.title });
//       if (product) {
//         totalAmount += item.price * item.qt;
//         items.push({
//           product: product._id,
//           quantity: item.qt
//         });

//         // Update stock
//         product.tt -= item.qt;
//         await product.save();
//       }
//     }

//     const order = new Order({
//       user: user._id,
//       items,
//       totalAmount,
//       amountPaid: totalAmount,
//       amountRemaining: 0
//     });

//     await order.save();

//     // Clear cart
//     await Cart.deleteMany({ username: req.cookies.username });
//     delete req.session.cart;

//     res.sendStatus(200);

//   } catch (err) {
//     console.error("Error in /buynow:", err);
//     res.sendStatus(500);
//   }
  
// });

router.post('/buynow', async (req, res) => {
  try {
    const username = req.cookies.username;
    if (!req.user || !username) {
      req.flash('danger', 'Please login to continue');
      return res.redirect('/users/login');
    }

    const cartItems = await Cart.find({ username }).lean();

    if (!cartItems || cartItems.length === 0) {
      req.flash('danger', 'Your cart is empty');
      return res.redirect('/cart/checkout');
    }

    let totalAmount = 0;
    const items = [];

    for (let item of cartItems) {
      const product = await Product.findOne({ slug: item.title });

      if (product) {
        const quantity = item.qt;
        const itemTotal = product.price * quantity;

        totalAmount += itemTotal;

        // Push product info into order
        items.push({
          product: product._id,
          quantity,
          price: product.price
        });

        // Update stock
        product.tt -= quantity;
        product.inStock = product.tt > 0;
        await product.save();
      }
    }

    const newOrder = new Order({
      user: req.user._id,
      items,
      totalAmount,
      paidAmount: 0,
      remainingAmount: totalAmount,
    });

    await newOrder.save();

    await Cart.deleteMany({ username });
    delete req.session.cart;

    req.flash('success', 'Order placed successfully!');
    res.redirect('/cart/thank-you');
  } catch (err) {
    console.error("Error in grouped buynow:", err);
    res.status(500).send("Something went wrong");
  }
});



// GET thank you page
router.get('/thank-you', (req, res) => {
  res.render('thankyou', { title: "Thank You" });
});



// routes/cart.js
// router.get('/buy', async (req, res) => {
//   try {
//     if (!req.user) {
//       req.flash('danger', 'Please login to place an order');
//       return res.redirect('/users/login');
//     }

//     const cart = req.session.cart;
//     // console.log("Cart after adding:", cart);

//     if (!cart || cart.length === 0) {
//       req.flash('danger', 'Your cart is empty');
//       return res.redirect('/cart');
//     }

//     const items = [];
//     let totalAmount = 0;

//     for (const item of cart) {
//       const product = await Product.findOne({ title: item.title });
//       if (!product) continue;

//       const quantity = item.qt;
//       const price = product.price;
//       const subTotal = price * quantity;
//       totalAmount += subTotal;

//       items.push({
//         product: product._id,
//         quantity,
//         price
//       });

//       // Update stock
//       product.tt -= quantity;
//       product.inStock = product.tt > 0;
//       await product.save();
//     }

//     const order = new Order({
//       user: req.user._id,
//       items,
//       totalAmount,
//       paidAmount: totalAmount,
//       remainingAmount: 0
//     });

//     await order.save();

//     // Clear the cart
//     req.session.cart = [];

//     req.flash('success', 'Order placed successfully!');
//     res.redirect('/cart/thank-you');

//   } catch (err) {
//     console.error("Error placing order:", err);
//     res.status(500).send("Server Error");
//   }
// });


router.post('/direct-buy/:productId', async (req, res) => {
  try {
    const productId = req.params.productId;
    const quantity = parseInt(req.body.quantity) || 1;

    if (!req.user) {
      req.flash('danger', 'Please login to buy');
      return res.redirect('/users/login');
    }

    const product = await Product.findById(productId);
    if (!product) {
      req.flash('danger', 'Product not found');
      return res.redirect('/products');
    }

    if (product.tt < quantity) {
      req.flash('danger', 'Insufficient stock');
      return res.redirect('back');
    }

    const totalAmount = product.price * quantity;

    const order = new Order({
      user: req.user._id,
      items: [{
        product: product._id,
        quantity,
        price: product.price
      }],
      totalAmount,
      paidAmount: 0,
      remainingAmount: totalAmount,
    });

    await order.save();

    product.tt -= quantity;
    product.inStock = product.tt > 0;
    await product.save();

    req.flash('success', 'Order placed successfully!');
    res.redirect('/cart/thank-you');
  } catch (err) {
    console.error("Direct Buy error:", err);
    res.status(500).send("Server Error");
  }
});




module.exports = router;
