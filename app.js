// //REMEMBER 

// **** USE gitignore to ignore the .env file. 
// -	Can just google gitignore template from github and copy paste
// -	Atom will show files greyed out ---- shows that the files will not be committed. 
//delete styles.css if not in use 


// **when deploying app on server, look for config vars and see how to set them up. 


// add responsive table layouts, for the tbales to wider width when in smaller screen. 
// consolidate all padding to first container div. 

//remove all white space in all files

const express = require('express');
const app = express();
const path = require('path');

const bcrypt = require('bcrypt');
const session = require('express-session');
const mongoose = require('mongoose');
const flash = require('connect-flash');
const { listeners } = require('process');
const User = require(__dirname + '/models/User');
const Stock = require(__dirname + '/models/Stock');
const Trade = require(__dirname + '/models/Trade');
const AppError = require(__dirname + '/utils/AppError');
const catchAsync = require(__dirname + '/utils/catchAsync');
const numConverter = require(__dirname + '/utils/numConverter');
const obtainCompanyInfo = require(__dirname + '/utils/obtainCompanyInfo');


app.set('views', path.join(__dirname + '/views'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'))
app.use(session({
    secret: 'yoursecret',
    resave: true,
    saveUninitialized: true,
}));

app.use(flash());
app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    next();
})

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
        return res.redirect('/');
    }
    next();
}

const getToday = () => {
    let date = new Date();
    return date.toLocaleDateString('en-GB');
}

app.get('/test', (req, res) => {
    res.render('test');
})

//****************************************
//*           LOGIN/REGISTER PAGE        *
//****************************************
app.get('/', (req, res) => {
    res.render('login', { page: 'Login' });
})


app.post('/login', catchAsync(async (req, res) => {
    let userLogin = req.body;
    const storedUserInfo = await User.find({ email: userLogin.email });
    if (!storedUserInfo.length) {
        throw new AppError('User does not exist');
    } else {
        const validPassword = await bcrypt.compare(userLogin.password, storedUserInfo[0].password)
        if (validPassword) {
            req.session.user_id = storedUserInfo[0]._id;
            res.redirect('/home')
        } else {
            throw new AppError('Wrong password', 404);
        }
    }
}))

app.post('/register', catchAsync(async (req, res) => {
    let { name, email, password, password2 } = req.body;
    //capitalise name 
    let arrayName = name.split(" ");
    for (let i = 0; i < arrayName.length; i++) {
        arrayName[i] = arrayName[i].charAt(0).toUpperCase() + arrayName[i].slice(1).toLowerCase();
    }
    name = arrayName.join(" ");

    const userExist = await User.find({ email: email });
    if (userExist.length) throw new AppError('Email already exists.');
    if (password !== password2) throw new AppError('Password do not match.');
    let hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({
        name: name,
        email: email,
        password: hashedPassword
    });
    req.session.user_id = newUser._id;
    await newUser.save();
    res.redirect('/home');
}))


//****************************************
//*             HOME PAGE                *
//****************************************
app.get('/home', requireLogin, catchAsync(async (req, res) => {
    const user_id = req.session.user_id;
    let user = await User.findOne({ _id: user_id });
    let name = user.name;

    let portfolio = await Stock.retrievePortfolio(user_id);
    let { userHoldings, totalValue, totalCost, currentValue, currentPercent } = portfolio;

    //sort by top 5
    userHoldings.sort((a, b) => b.posValue[0] - a.posValue[0]);
    userHoldings.splice(5);

    portfolio = {
        userHoldings: userHoldings,
        totalValue: totalValue,
        totalCost: totalCost,
        currentValue: currentValue,
        currentPercent: currentPercent
    }
    res.render('home', { page: 'Homepage', name, portfolio });
}))


//****************************************
//*             PORTFOLIO PAGE           *
//****************************************
app.get('/portfolio', requireLogin, catchAsync(async (req, res) => {
    const user_id = req.session.user_id;
    let portfolio = await Stock.retrievePortfolio(user_id);
    res.render('portfolio', { page: 'Portfolio', portfolio })
}))

//****************************************
//*            TRADES PAGE               *
//****************************************
app.get('/trades', requireLogin, catchAsync(async (req, res) => {
    const user_id = req.session.user_id;
    const trades = await Trade.find({ user: user_id });
    for (let trade of trades) {
        trade.buyprice = numConverter(trade.price)
        trade.value = numConverter(trade.price * trade.quantity);
    }
    res.render('trades', { page: 'trades', trades })
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
    const response = await obtainCompanyInfo(ticker);

    const user = await User.findOne({ _id: req.session.user_id });
    const stock = await Stock.find({ user: user._id, ticker: ticker });
    if (stock.length) {
        let stockId = stock[0]._id;
        let newStockQuantity = stock[0].quantity + parseFloat(quantity, 10);
        let newStockPrice = numConverter(((stock[0].price * stock[0].quantity) + (price * quantity)) / newStockQuantity);
        let stockUpdate = await Stock.updateOne({ _id: stockId }, { price: newStockPrice[0], quantity: newStockQuantity })
    } else {
        let newStockPrice = numConverter(price);
        const newStock = new Stock({ ticker: ticker.toUpperCase(), price: newStockPrice[0], quantity: quantity })
        newStock.user = user;
        await newStock.save();
    }

    const newTrade = new Trade({ date: getToday(), ticker: ticker.toUpperCase(), price: price, quantity: quantity, transaction: 'Buy' })
    newTrade.user = user;
    await newTrade.save();

    req.flash('success', `Successfully added ${ticker}`);
    res.redirect('/portfolio');
}))


//****************************************
//*             SELL PAGE                *
//****************************************
app.get('/sell', requireLogin, catchAsync(async (req, res) => {
    const user_id = req.session.user_id;
    const userHoldings = await Stock.find({ user: user_id });
    res.render('sell', { page: 'Sell Stock', stocks: userHoldings });
}))

app.post('/sell', requireLogin, catchAsync(async (req, res, next) => {
    const { ticker, price, quantity } = req.body;
    const user = await User.findOne({ _id: req.session.user_id });
    const stock = await Stock.find({ user: user, ticker: ticker });
    if (stock.length) {
        let stockId = stock[0]._id;
        let stockQuantity = stock[0].quantity;
        if (stockQuantity < parseFloat(quantity)) {
            throw new AppError(`You do not own enough ${ticker} stock.`);
        } else if (stockQuantity === parseFloat(quantity)) {
            await Stock.deleteOne({ _id: stockId });
        } else {
            let newStockQuantity = stockQuantity - parseFloat(quantity, 10);
            await Stock.updateOne({ _id: stockId }, { quantity: newStockQuantity });
        }
        const newTrade = new Trade({ date: getToday(), ticker: ticker.toUpperCase(), price: price, quantity: quantity, transaction: 'Sell' })
        newTrade.user = user;
        await newTrade.save();
        req.flash('success', `Successfully sold ${ticker}`);
        res.redirect('/portfolio');
    } else {
        throw new AppError('Stock does not exist');
    }
}))


//****************************************
//*     TICKER SEARCH PAGE               *
//****************************************
app.get('/ticker/:ticker', requireLogin, catchAsync(async (req, res) => {
    let ticker = req.params.ticker;
    ticker = ticker.toUpperCase();

    let companyInfo = await obtainCompanyInfo(ticker);

    //check if user possess stock
    const user_id = req.session.user_id;
    let userStock = await Stock.findOne({ user: user_id, ticker: ticker });
    if (!userStock) {
        userStock = false;
    } else {
        userStock.totalCost = numConverter(userStock.quantity * userStock.price);
        userStock.totalValue = numConverter(userStock.quantity * companyInfo.close);
        userStock.unrealisedValue = numConverter(userStock.totalValue[0] - userStock.totalCost[0]);
        userStock.unrealisedPercent = numConverter(userStock.unrealisedValue[0] / userStock.totalCost[0] * 100);
    }

    //check user trade history 
    let userTrades = await Trade.find({ user: user_id, ticker: ticker });
    if (!userTrades.length) {
        userStock = false;
    } else {
        for (let trade of userTrades) {
            trade.tradeValue = numConverter(trade.quantity * trade.price)
            trade.buyPrice = numConverter(trade.price)
        }
    }
    res.render('ticker', { page: `Ticker: ${ticker}`, companyInfo, userStock, userTrades })
}))


app.post('/ticker', requireLogin, catchAsync(async (req, res) => {
    let { ticker } = req.body;
    ticker = ticker.toUpperCase();
    res.redirect(`/ticker/${ticker}`)
}))

//****************************************
//*            LOGOUT ROUTE              *
//****************************************
app.get('/logout', requireLogin, (req, res) => {
    req.session.user_id = null;
    res.redirect('/');
})

//****************************************
//*         ROUTE NOT FOUND              *
//****************************************
app.use((req, res) => {
    throw new AppError('Page not found', 404);
})

//****************************************
//*            ERROR HANDLER             *
//****************************************
app.use((err, req, res, next) => {
    const { status = 500, message = 'Something went wrong' } = err;
    let previousURL = req.headers.referer;
    console.log(err);
    res.render('error', { status, message, previousURL });
})

app.listen(3000, () => {
    console.log('running on port 3000');
})