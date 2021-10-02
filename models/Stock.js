const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const User = require('./User');
const numConverter = require('../utils/numConverter');
const obtainCompanyInfo = require('../utils/obtainCompanyInfo');

const stockSchema = new Schema({
    ticker: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
})

stockSchema.statics.retrievePortfolio = async function (userId) {
    const userHoldings = await this.find({ user: userId });
    let totalCost = 0;
    let totalValue = 0;
    //obtain individual stock info
    for (let holding of userHoldings) {
        let compInfo = await obtainCompanyInfo(holding.ticker);
        holding.name = compInfo.name;
        holding.lastPrice = numConverter(compInfo.close);
        holding.stock_exchange = compInfo.stock_exchange;
        holding.posValue = numConverter(holding.lastPrice[0] * holding.quantity);
        holding.unrealisedValue = numConverter(parseFloat(holding.lastPrice[0]) - parseFloat(holding.price));
        holding.unrealisedPercent = numConverter(holding.unrealisedValue[0] / parseFloat(holding.price) * 100);
        holding.unrealisedValue = numConverter(holding.unrealisedValue[0] * holding.quantity);

        //calculte total cost of portfolio
        totalCost += parseFloat(holding.price) * holding.quantity;
        totalValue += parseFloat(holding.posValue[0]);
    }
    totalCost = numConverter(totalCost);
    totalValue = numConverter(totalValue);
    currentValue = numConverter(totalValue[0] - totalCost[0]);
    currentPercent = numConverter(currentValue[0] / totalCost[0] * 100);
    holdings = {
        userHoldings: userHoldings,
        totalValue: totalValue,
        totalCost: totalCost,
        currentValue: currentValue,
        currentPercent: currentPercent
    }
    return holdings;
};
module.exports = mongoose.model('Stock', stockSchema);