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
const Trade = require(__dirname + '/models/Trade')
const AppError = require(__dirname + '/models/AppError');


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
        return res.redirect('/')
    }
    next();
}

function catchAsync(fn) {
    return function (req, res, next) {
        fn(req, res, next).catch(error => next(error))
    }
}

async function obtainMarketInfo(ticker) {
    const URL = 'http://api.marketstack.com/v1/eod/latest';
    const params = { params: { access_key: API_KEY, symbols: ticker } }
    try {
        const response = await axios.get(URL, params)
        return response;
    } catch (error) {
        throw new AppError(error.response.statusText, error.response.status);
    }
}

async function obtainCompanyName(ticker) {
    const URL = 'http://api.marketstack.com/v1/tickers/' + ticker;
    const params = { params: { access_key: API_KEY } }
    try {
        const response = await axios.get(URL, params)
        return response;
    } catch (error) {
        throw new AppError(error.response.statusText, error.response.status);
    }
}

async function obtainCompanyInfo(ticker) {
    let marketInfo = await obtainMarketInfo(ticker);
    let companyName = await obtainCompanyName(ticker);
    let { name, symbol, stock_exchange } = companyName.data;
    let { close } = marketInfo.data.data[0];
    let companyInfo = {
        name: name,
        symbol: symbol,
        stock_exchange: stock_exchange.acronym,
        close: close
    }
    return companyInfo;
}

function twoDecimalPlace(num) {
    let int = (Math.round(num * 100) / 100).toFixed(2);
    let str = num.toLocaleString('en-US', { maximumFractionDigits: 2 });
    return [int, str];
}






//****************************************
//*           LOGIN/REGISTER PAGE        *
//****************************************
app.get('/', (req, res) => {
    res.render('login', { page: 'Login' })
})
app.get('/test', (req, res) => {
    let cost = 1000;
    let value = 2000;

    res.render('test', { cost, value })
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
            res.redirect('/home')
        } else {
            throw new AppError('Wrong password', 404);
        }
    }
}))

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
    console.log(newUser._id);
    req.session.user_id = newUser._id
    req.session.name = newUser.name;
    res.redirect('/home')
}))


//****************************************
//*             HOME PAGE                *
//****************************************
app.get('/home', requireLogin, catchAsync(async (req, res) => {
    const user_id = req.session.user_id;
    const user = await User.findOne({ _id: user_id });
    const name = user.name;

    const userHoldings = await Stock.find({ user: user_id });
    let totalCost = 0;
    let totalValue = 0;

    //obtain individual stock info
    for (let holding of userHoldings) {
        let compInfo = await obtainCompanyInfo(holding.ticker);
        holding.name = compInfo.name;
        holding.lastPrice = twoDecimalPlace(compInfo.close);
        holding.stock_exchange = compInfo.stock_exchange;
        holding.posValue = twoDecimalPlace(holding.lastPrice[0] * holding.quantity);
        holding.unrealisedValue = twoDecimalPlace(parseFloat(holding.lastPrice[0]) - parseFloat(holding.price));
        holding.unrealisedPercent = twoDecimalPlace(holding.unrealisedValue[0] / parseFloat(holding.price) * 100);
        holding.unrealisedValue = twoDecimalPlace(holding.unrealisedValue[0] * holding.quantity);

        //calculte total cost of portfolio
        totalCost += parseFloat(holding.price) * holding.quantity;
        totalValue += parseFloat(holding.posValue[0]);
    }
    totalValue = twoDecimalPlace(totalValue);
    totalCost = twoDecimalPlace(totalCost);
    currentValue = twoDecimalPlace(totalValue[0] - totalCost[0]);
    currentPercent = twoDecimalPlace(currentValue[0] / totalCost[0] * 100);

    res.render('home', { page: 'Homepage', stocks: userHoldings, name, totalCost, totalValue, currentValue, currentPercent })
}))


app.get('/positions', requireLogin, catchAsync(async (req, res) => {
    const user_id = req.session.user_id;

    const userHoldings = await Stock.find({ user: user_id });
    let totalCost = 0;
    let totalValue = 0;

    //obtain individual stock info
    for (let holding of userHoldings) {
        let compInfo = await obtainCompanyInfo(holding.ticker);
        holding.name = compInfo.name;
        holding.lastPrice = twoDecimalPlace(compInfo.close);
        holding.stock_exchange = compInfo.stock_exchange;
        holding.posValue = twoDecimalPlace(holding.lastPrice[0] * holding.quantity);
        holding.unrealisedValue = twoDecimalPlace(parseFloat(holding.lastPrice[0]) - parseFloat(holding.price));
        holding.unrealisedPercent = twoDecimalPlace(holding.unrealisedValue[0] / parseFloat(holding.price) * 100);
        holding.unrealisedValue = twoDecimalPlace(holding.unrealisedValue[0] * holding.quantity);

        //calculte total cost of portfolio
        totalCost += parseFloat(holding.price) * holding.quantity;
        totalValue += parseFloat(holding.posValue[0]);
    }

    console.log(totalValue[0]);
    console.log(totalCost[0]);
    currentValue = twoDecimalPlace(totalValue[0] - totalCost[0]);
    currentPercent = twoDecimalPlace(currentValue[0] / totalCost[0] * 100);

    res.render('positions', { page: 'Portfolio', stocks: userHoldings, totalCost, totalValue, currentValue, currentPercent })
}))

//****************************************
//*            BUY PAGE                *
//****************************************
app.get('/buy', requireLogin, (req, res) => {
    res.render('buy', { page: 'Buy Stock' })
})

app.post('/buy', requireLogin, catchAsync(async (req, res) => {
    let { ticker, price, quantity } = req.body;
    ticker = ticker.toUpperCase();

    //check if valid ticker
    const response = await obtainMarketInfo(ticker);
    // if (response.status !== 200) throw new AppError(response.statusText, response.status)

    const user = await User.findOne({ _id: req.session.user_id })
    const stock = await Stock.find({ user: user._id, ticker: ticker });
    if (stock.length) {
        let stockId = stock[0]._id;
        let newStockQuantity = stock[0].quantity + parseFloat(quantity, 10);
        let newStockPrice = twoDecimalPlace(((stock[0].price * stock[0].quantity) + (price * quantity)) / newStockQuantity);
        await Stock.updateOne({ _id: stockId }, { price: newStockPrice[0], quantity: newStockQuantity })
    } else {
        let newStockPrice = twoDecimalPlace(price);
        const newStock = new Stock({ ticker: ticker.toUpperCase(), price: newStockPrice[0], quantity: quantity })
        newStock.user = user;
        await newStock.save();
    }
    const newTrade = new Trade({ ticker: ticker.toUpperCase(), price: price, quantity: quantity, transaction: 'Buy' })
    newTrade.user = user;
    await newTrade.save()


    res.redirect('/home')
    // add buy alert
}))


//****************************************
//*             SELL PAGE                *
//****************************************
app.get('/sell', requireLogin, catchAsync(async (req, res) => {
    const user_id = req.session.user_id;
    const userHoldings = await Stock.find({ user: user_id });
    res.render('sell', { page: 'Sell Stock', stocks: userHoldings })
}))

app.post('/sell', requireLogin, catchAsync(async (req, res, next) => {
    const { ticker, price, quantity } = req.body;
    const user = await User.findOne({ _id: req.session.user_id })
    const stock = await Stock.find({ user: user, ticker: ticker });
    if (stock.length) {
        let stockId = stock[0]._id;
        let stockQuantity = stock[0].quantity;
        if (stockQuantity < parseFloat(quantity)) {
            throw new AppError('you dont have so many stock to sell')

        } else if (stockQuantity === parseFloat(quantity)) {
            const newTrade = new Trade({ ticker: ticker.toUpperCase(), price: price, quantity: quantity, transaction: 'Sell' })
            newTrade.user = user;
            await newTrade.save()
            await Stock.deleteOne({ _id: stockId });
            res.redirect('/home');
        } else {
            const newTrade = new Trade({ ticker: ticker.toUpperCase(), price: price, quantity: quantity, transaction: 'Sell' })
            newTrade.user = user;
            await newTrade.save()
            let newStockQuantity = stockQuantity - parseFloat(quantity, 10);
            await Stock.updateOne({ _id: stockId }, { quantity: newStockQuantity })
            res.redirect('/home');
        }
    } else {
        throw new AppError('Stock does not exist')
    }
    // // add buy alert
}))

//****************************************
//*            LOGOUT ROUTE              *
//****************************************
app.get('/logout', requireLogin, (req, res) => {
    req.session.user_id = null;
    res.redirect('/');
})

//****************************************
//*            SEARCH PAGE               *
//****************************************
app.get('/stockinfo', requireLogin, catchAsync(async (req, res) => {
    let ticker = req.query.search;
    ticker = ticker.toUpperCase();

    let companyInfo = await obtainCompanyInfo(ticker);

    //check if user possess stock
    const user_id = req.session.user_id;
    console.log('thisisticker', ticker);
    console.log(user_id)
    let userStock = await Stock.find({ user: user_id, ticker: ticker });
    if (!userStock.length) userStock = false;

    res.render('search', { page: 'search', companyInfo: companyInfo, userStock: userStock })
}))


//****************************************
//*            ERROR HANDLER             *
//****************************************
app.use((err, req, res, next) => {
    console.log(err);
    const { status = 500, message = 'Something went wrong' } = err;
    res.render('error', { status, message })
})

app.listen(3000, () => {
    console.log('running on port 3000')
})






// to do:
// error page

//card to replace table at home page. -- or dropdown card aftr table
// if name two separate words, split words

//check jstock features and mimic: 
// - click in for more stock info.
//- chart with stock price
// - your performance with the stock 


//sort by in the portfolio table
//  add in history of trades
// pop up page for buy/sell instead of exact page.


//black navbar - only expand search box when clicked
