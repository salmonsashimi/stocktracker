// //REMEMBER 

// **** USE gitignore to ignore the .env file. 
// -	Can just google gitignore template from github and copy paste
// -	Atom will show files greyed out ---- shows that the files will not be committed. 

// **when deploying app on server, look for config vars and see how to set them up. 

require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');

const bcrypt = require('bcrypt');
const session = require('express-session');
const mongoose = require('mongoose')
const axios = require('axios');
const User = require(__dirname + '/models/User')
const Stock = require(__dirname + '/models/Stock')
const AppError = require(__dirname + '/models/AppError');


const STOCK_URL = 'http://api.marketstack.com/v1/eod/latest';
const API_KEY = process.env.API_KEY;

app.set('views', path.join(__dirname + '/views'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'))
app.use(session({
    secret: 'yoursecret',
    resave: true,
    saveUninitialized: true,
}));


mongoose.connect('mongodb://localhost:27017/stocktracker', {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
})
    .then(() => console.log('mongo connection success'))
    .catch((e) => console.log('mongo connection error', e))


//middleware 
const requireLogin = (req, res, next) => {
    if (!req.session.user_id) {
        return res.redirect('/login')
    }
    next();
}

function catchAsync(fn) {
    return function (req, res, next) {
        fn(req, res, next).catch(error => next(error))
    }
}

async function obtainMarketInfo(ticker) {
    let params = { params: { access_key: API_KEY, symbols: ticker } }
    try {
        const response = await axios.get(STOCK_URL, params)
        return response;
    } catch (error) {
        return error.response;
    }
}

//routings
//***** REGISTRATION PAGE *****
app.get('/register', (req, res) => {
    res.render('register', { page: 'Register' })
})

app.post('/register', catchAsync(async (req, res) => {
    let { name, email, password, password2 } = req.body;
    name = name.charAt(0).toUpperCase() + name.slice(1);
    const userExist = await User.find({ email: email });
    if (userExist.length) throw new AppError('Email already exists.');
    if (password !== password2) throw new AppError('Password do not match.');
    let hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({
        name: name,
        email: email,
        password: hashedPassword
    })
    await newUser.save()
    res.redirect('/login')
}))


//***** LOGIN PAGE *****
app.get('/login', (req, res) => {
    res.render('login', { page: 'Login' })
})

app.post('/login', catchAsync(async (req, res, next) => {
    let userLogin = req.body;
    const storedUserInfo = await User.find({ email: userLogin.email });
    if (!storedUserInfo.length) {
        throw new AppError('User does not exist');
    } else {
        const validPassword = await bcrypt.compare(userLogin.password, storedUserInfo[0].password)
        if (validPassword) {
            req.session.user_id = storedUserInfo[0]._id;
            req.session.name = storedUserInfo[0].name;
            res.redirect('/')
        } else {
            throw new AppError('Wrong password', 404);
        }
    }
}))

//***** HOME PAGE *****
app.get('/', requireLogin, catchAsync(async (req, res) => {
    const user_id = req.session.user_id;
    const name = req.session.name;
    const userHoldings = await Stock.find({ user: user_id });

    for (let holding of userHoldings) {
        let marketInfo = await obtainMarketInfo(holding.ticker)
        holding.currentPrice = marketInfo.data.data[0].close;
    }

    res.render('home', { page: 'Homepage', stocks: userHoldings, name: name })
}))

// ***** BUY PAGE *****
app.get('/buy', requireLogin, (req, res) => {
    res.render('buy', { page: 'Buy Stock' })
})

app.post('/buy', requireLogin, catchAsync(async (req, res) => {
    let { ticker, price, quantity } = req.body;
    ticker = ticker.toUpperCase();

    //check if valid ticker
    const response = await obtainMarketInfo(ticker);
    if (response.status !== 200) throw new AppError(response.statusText, response.status)

    const user = await User.findOne({ _id: req.session.user_id })
    const stock = await Stock.find({ user: user._id, ticker: ticker });
    if (stock.length) {
        let stockId = stock[0]._id;
        let newStockQuantity = stock[0].quantity + parseInt(quantity, 10);
        let newStockPrice = Math.round((((stock[0].price * stock[0].quantity) + (price * quantity)) / newStockQuantity) * 100) / 100;
        await Stock.updateOne({ _id: stockId }, { price: newStockPrice, quantity: newStockQuantity })
    } else {
        const newStock = new Stock({ ticker: ticker.toUpperCase(), price: price, quantity: quantity })
        newStock.user = user;
        await newStock.save();
    }
    res.redirect('/')
    // add buy alert
}))


//***** SELL PAGE *****
app.get('/sell', requireLogin, catchAsync(async (req, res) => {
    const user_id = req.session.user_id;
    const userHoldings = await Stock.find({ user: user_id });
    res.render('sell', { page: 'Sell Stock', stocks: userHoldings })
}))

app.post('/sell', requireLogin, catchAsync(async (req, res, next) => {
    const { ticker, price, quantity } = req.body;
    console.log(ticker, price, quantity);
    const user = await User.findOne({ _id: req.session.user_id })
    const stock = await Stock.find({ user: user, ticker: ticker });
    if (stock.length) {
        let stockId = stock[0]._id;
        let stockQuantity = stock[0].quantity;
        if (stockQuantity < parseInt(quantity)) {
            throw new AppError('you dont have so many stock to sell')

        } else if (stockQuantity === parseInt(quantity)) {
            await Stock.deleteOne({ _id: stockId });
            res.redirect('/');
        } else {
            let newStockQuantity = stockQuantity - parseInt(quantity, 10);
            await Stock.updateOne({ _id: stockId }, { quantity: newStockQuantity })
            res.redirect('/');
        }
    } else {
        throw new AppError('stock does not exist')
    }
    // // add buy alert
}))

//***** LOGOUT ROUTE *****
app.get('/logout', requireLogin, (req, res) => {
    req.session.user_id = null;
    res.redirect('/login');
})

//***** SEARCH PAGE *****
app.get('/search', requireLogin, catchAsync(async (req, res) => {
    let ticker = req.query.search;
    ticker = ticker.toUpperCase();

    //check if valid ticker
    const response = await obtainMarketInfo(ticker);
    if (response.status !== 200) throw new AppError(response.statusText, response.status)
    let marketInfo = response.data.data[0];


    //check if user possess stock
    const user_id = req.session.user_id;
    console.log('thisisticker', ticker);
    console.log(user_id)
    let userStock = await Stock.find({ user: user_id, ticker: ticker });
    if (!userStock.length) userStock = false;

    res.render('search', { page: 'search', marketInfo: marketInfo, userStock: userStock })
}))


//***** ERROR HANDLER *****
app.use((err, req, res, next) => {
    const { status = 500, message = 'Something went wrong' } = err;
    res.status(status).send(message);
})

app.listen(3000, () => {
    console.log('running on port 3000')
})





// to do:
// error page
//search page with card.