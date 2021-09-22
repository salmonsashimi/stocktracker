require('dotenv').config();
const axios = require('axios');
const AppError = require(__dirname + '/AppError');

const API_KEY = process.env.API_KEY;

const obtainMarketInfo = async function (ticker) {
    const URL = 'http://api.marketstack.com/v1/eod/latest';
    const params = { params: { access_key: API_KEY, symbols: ticker } }
    try {
        const response = await axios.get(URL, params)
        return response;
    } catch (error) {
        throw new AppError(error.response.statusText, error.response.status);
    }
}

const obtainCompanyName = async function (ticker) {
    const URL = 'http://api.marketstack.com/v1/tickers/' + ticker;
    const params = { params: { access_key: API_KEY } }
    try {
        const response = await axios.get(URL, params)
        return response;
    } catch (error) {
        throw new AppError(error.response.statusText, error.response.status);
    }
}

const obtainCompanyInfo = async function (ticker) {
    console.log('running obtaincompanyinfo with ' + ticker);
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
    if (!companyInfo.name) {
        throw new AppError('Stock does not exist')
    } else { return companyInfo; }
}

module.exports = obtainCompanyInfo;