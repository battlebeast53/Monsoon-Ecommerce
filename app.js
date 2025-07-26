var express=require('express');
var path=require('path');
var mongoose=require('mongoose');
var bodyParser=require('body-parser');
var session =require('express-session');
var app=express();
var expressValidator=require('express-validator');
var passport=require('passport');
const flash = require('connect-flash');
require('dotenv').config();


var cookieParser = require('cookie-parser')
app.set('views',path.join(__dirname,'views'))
app.set('view engine','ejs');

const dbUrl = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_HOST}/${process.env.MONGO_DB}?retryWrites=true&w=majority`;

mongoose.connect(dbUrl)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));


//set public folder 
app.use(express.static(path.join(__dirname,'public')));

//set global errors variable
app.locals.errors=null;

//Get Page Model
const Page = require('./models/page');


//get all pages to pass header.ejs
    (async () => {
  try {
    const pages = await Page.find({}).sort({ sorting: 1 });
    app.locals.pages = pages;
  } catch (err) {
    console.error(err);
  }
})();

 
     //get category model                
    const Category = require('./models/category');               
      (async () => {
        try {
          const categories = await Category.find();
          app.locals.categories = categories;
        } catch (err) {
          console.error(err);
        }
      })();


//cookie-parser
app.use(cookieParser())

//body parser 
// ✅ Preferred (Express 4.16+)
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

//express session 
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    // cookie: { secure: true }
  }));

//express messages 
app.use(flash());
app.use(function (req, res, next) {
  res.locals.messages = require('express-messages')(req, res);
  next();
});

app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.danger = req.flash('danger');
  res.locals.info = req.flash('info');
  res.locals.error = req.flash('error');
  next();
});


//passport config
require('./config/passport')(passport);
// passport 
app.use(passport.initialize());
app.use(passport.session());


app.use((req, res, next) => {
  res.locals.loggedIn = !!req.user;
  res.locals.user = req.user || null; // Optional: helpful in views
  next();
});

const { VisitorDay, VisitorTotal } = require('./models/visitor');
const moment = require('moment');

// Visitor tracking middleware
app.use(async (req, res, next) => {
  try {
    // Only count once per session per day
    if (!req.session.hasVisitedToday) {
      const today = moment().format('YYYY-MM-DD');
      const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');

      // Increment today's count
      await VisitorDay.findOneAndUpdate(
        { date: today },
        { $inc: { count: 1 } },
        { upsert: true }
      );

      // Increment total count
      await VisitorTotal.findOneAndUpdate(
        { key: 'total' },
        { $inc: { count: 1 } },
        { upsert: true }
      );

      req.session.hasVisitedToday = true;
    }

    // Fetch today's, yesterday's, and total counts for display
    const todayDoc = await VisitorDay.findOne({ date: moment().format('YYYY-MM-DD') });
    const yesterdayDoc = await VisitorDay.findOne({ date: moment().subtract(1, 'days').format('YYYY-MM-DD') });
    const totalDoc = await VisitorTotal.findOne({ key: 'total' });

    res.locals.visitorToday = todayDoc ? todayDoc.count : 0;
    res.locals.visitorYesterday = yesterdayDoc ? yesterdayDoc.count : 0;
    res.locals.visitorTotal = totalDoc ? totalDoc.count : 0;
  } catch (err) {
    res.locals.visitorToday = 0;
    res.locals.visitorYesterday = 0;
    res.locals.visitorTotal = 0;
  }
  next();
});


app.get('*',async function(req,res,next){
    res.locals.cart=req.session.cart;
    res.locals.user=req.user||null;
    next();
})


app.get('/coming-soon', (req, res) => {
  res.render('coming_soon');
});

//set routes
var pages=require('./routes/pages.js');
var products=require('./routes/products.js');

const home = require('./routes/home.js');


var cart=require('./routes/cart.js');
var users=require('./routes/users.js');
var adminRoutes = require('./routes/admin');


app.use('/admin', adminRoutes);
app.use('/products',products);

app.use('/home',home);

app.use('/cart',cart);
app.use('/users',users);
app.use('/',pages);

// app.use('/', generalRoutes);




//giving the port number 
var port=8000;
app.listen(port,function(){
    console.log('server listening on ' +port  );
})