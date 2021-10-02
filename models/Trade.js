const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const User = require('./User')

const tradeSchema = new Schema({
    date: {
        type: String,
        required: true
    },
    transaction: {
        type: String,
        required: true
    },
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

module.exports = mongoose.model('Trade', tradeSchema);