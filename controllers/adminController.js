const User = require('../models/user');
const Product = require('../models/product');
const Order = require('../models/order');
const Category = require('../models/category');


// const orderCount = await Order.countDocuments();


// Admin dashboard
exports.getDashboard = async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const productCount = await Product.countDocuments();
    const products = await Product.find();
    // const orders = await Order.find().populate('user').populate('items.product');
    const allOrders = await Order.find()
    .populate('user')
    .populate('items.product')
    .sort({ createdAt: -1 });

    const uniqueOrdersMap = new Map();

    // Keep only the latest order for each user
    for (const order of allOrders) {
      const userId = order.user._id.toString();
      if (!uniqueOrdersMap.has(userId)) {
        uniqueOrdersMap.set(userId, order);
      }
    }

    const orders = Array.from(uniqueOrdersMap.values());

    res.render('admin/dashboard', {
      userCount,
      productCount,
      products,
      orders
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong");
  }
};

// Get all orders by a specific user
exports.getOrdersByUser = async (req, res) => {
  try {
    const userId = req.params.userId;

    const orders = await Order.find({ user: userId })
      .populate('user')
      .populate('items.product')
      .sort({ createdAt: -1 });

    res.render('admin/user_orders', {
      user: orders.length > 0 ? orders[0].user : null,
      orders
    });
  } catch (err) {
    console.error("Error fetching orders for user:", err);
    res.status(500).send("Error fetching user's orders");
  }
};



exports.getAddProduct = async (req, res) => {
    // Fetch all categories to display in the add product form
  try {
    const categories = await Category.find({});

    res.render('admin/add_product', { categories });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/dashboard');
  }
};


exports.postAddProduct = async (req, res) => {
  try {
    const { title, desc, category, price, tt, size } = req.body;
    const image = req.file ? req.file.path : ''; // Cloudinary gives `path` (i.e., URL)

    const product = new Product({
      title,
      slug: title.toLowerCase().replace(/ /g, '-'),
      desc,
      category,
      price,
      image,
      tt,
      inStock: tt > 0,
      size
    });

    await product.save();
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    res.send('Error adding product');
  }
};


// Edit product - GET
exports.getEditProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    const categories = await Category.find();


    res.render('admin/edit_product', { product , categories});
  } catch (err) {
    console.error(err);
    res.redirect('/admin/dashboard');
  }
};

// Edit product - POST
exports.postEditProduct = async (req, res) => {
  const { title, desc, category, price, tt, size } = req.body;
  const updateData = {
    title,
    slug: title.toLowerCase().replace(/ /g, '-'),
    desc,
    price,
    category,
    tt,
    inStock: tt > 0,
    size
  };

  if (req.file) {
    updateData.image = req.file.path; // Cloudinary image URL
  }

  try {
    await Product.findByIdAndUpdate(req.params.id, updateData);
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/dashboard');
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/dashboard');
  }
};

// Toggle in-stock/out-of-stock
exports.toggleStock = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    product.inStock = product.inStock === true ? false : true;
    await product.save();
    res.redirect('/admin/dashboard');
  } catch (err) {
    res.redirect('/admin/dashboard');
  }
};



exports.getOrderDetails = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user')
      .populate('items.product');

    if (!order) {
      req.flash('danger', 'Order not found');
      return res.redirect('/admin/dashboard');
    }

    res.render('admin/order_details', { order });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading order details");
  }
};


exports.getEditOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user')
      .populate('items.product');

    if (!order) {
      req.flash('danger', 'Order not found');
      return res.redirect('/admin/orders');
    }

    res.render('admin/edit_order', { order });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};



// exports.postEditOrder = async (req, res) => {
//   try {
//     // const { amountPaid, amountRemaining } = req.body;
    
//     const order = await Order.findById(req.params.id);
//     if (!order) {
//       req.flash('danger', 'Order not found');
//       return res.redirect('/admin/dashboard');
//     }

//     // Update amounts
//     // order.paidAmount = Number(amountPaid);
//     // order.remainingAmount = Number(amountRemaining);
    

//     // (Optional) You can also update individual item quantities here
//     if (req.body.quantities) {
//       order.items.forEach((item, index) => {
//         item.quantity = Number(req.body.quantities[index]);
//       });
//     }

//     const newPayment = Number(req.body.newPayment);
//     if (!isNaN(newPayment) && newPayment > 0) {
//       order.amountPaid += newPayment;
//       order.amountRemaining = order.totalAmount - order.amountPaid;
//     }
//     console.log("New Payment:", req.body.newPayment);


//     await order.save();
//     req.flash('success', 'Order updated successfully');
//     id = req.params.id;
//     res.redirect(`/admin/orders/${id}`);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Error updating order');
//   }
// };


exports.postEditOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      req.flash('danger', 'Order not found');
      return res.redirect('/admin/dashboard');
    }

    // Safely parse new payment
    const newPayment = Number(req.body.newPayment);
    const previousPaid = order.paidAmount ?? 0;

    // console.log("New payment received:", newPayment);
    // console.log("Previous paid amount:", previousPaid);

    if (!isNaN(newPayment) && newPayment > 0) {
      order.paidAmount = previousPaid + newPayment;
      order.remainingAmount = Math.max(order.totalAmount - order.paidAmount, 0);
    }


    await order.save();

    req.flash('success', 'Order updated successfully');
    res.redirect(`/admin/orders/${order._id}`);
  } catch (err) {
    console.error("Error in postEditOrder:", err);
    res.status(500).send('Error updating order');
  }
};


exports.deleteOrder = async (req, res) => {
  try {
    const orderId = req.params.id;

    // Delete the order
    await Order.findByIdAndDelete(orderId);

    req.flash('success', 'Order deleted successfully');
    res.redirect(`/admin/dashboard`);  // Redirect to order list page
  } catch (err) {
    console.error('Error deleting order:', err);
    req.flash('danger', 'Failed to delete order');
    res.redirect(`/admin/dashboard/${orderId}`);  // Redirect back to the order details page
  }
};
