const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const User = require('./User')


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

module.exports = mongoose.model('Stock', stockSchema);