import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { saltRounds } from '../config';

import Product from '../models/ProductModel';
import Payment from '../models/PaymentModel';
import Delivery from '../models/DeliveryModel';

const Schema = mongoose.Schema;
const Order = new Schema({
    payment: { type: Schema.Types.ObjectId, required: true, ref: 'Payment' },
    delivery: { type: Schema.Types.ObjectId, required: true, ref: 'Delivery' },
    products: [{
        product: { type: Schema.Types.ObjectId, required: true, ref: 'Product'},
        size: { type: Schema.Types.ObjectId, required: true, ref: 'Size' },
        amount: { type: Number, required: true, default: 1 }
    }],
    price: { type: Number, required: true, default: 0 },
    client: { type: Object, required: true },
    address: { type: Object, required: true },
    createdAt: { type: Number, default: Date.now },
    status: { type: String, required: true, default: 'Transaction Pending' },
    hash: { type: String, required: true, default: 'hash' }
});

Order.pre('save', async function(next) {
    try {
        const productsIds = this.products.map(product => product.product);
        const products = await Product.find({_id: {$in: productsIds}});

        const productsPrice = Math.round(this.products.reduce((acc, product) => {
            const pr = products.find(item => {
                const itemid = mongoose.Types.ObjectId(item._id);
                const prodid = mongoose.Types.ObjectId(product.product);
                return itemid.equals(prodid);
            });
            const productPrice = pr ? pr.price : 0;
            return acc + (product.amount * productPrice);
        }, 0) * 1e12) / 1e12;

        const payment = await Payment.findById(this.payment);
        const paymentPrice = payment.price;
        const delivery = await Delivery.findById(this.delivery);
        const deliveryPrice = delivery.price;
        this.price = Math.round((Number(productsPrice) + Number(paymentPrice) + Number(deliveryPrice)) * 1e12) / 1e12;

        const hashed = await bcrypt.hash(`SomerandomString123${Date.now()}`, saltRounds);
        this.hash = hashed;

        next();
    } catch (e) {
        console.log(e);
        next(e);
    }
});

export default mongoose.model('Order', Order);
