const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const OrderSchema = new Schema({
    orderDate: {
        type: Date,
        default: Date.now,
    },
    orderNumber: {
        type: Number,
    },
    user: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    orderItems: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product"
        },
        quantity: {
            type: Number,
            require: true
        }
    }]
});

module.exports = mongoose.model('Order', OrderSchema);