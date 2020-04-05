require("dotenv").config()

const config = {
    databaseURL: process.env.DATABASE,
    mail: process.env.MAIL,
    Stripe_Secret_Key: process.env.Stripe_Secret_Key
}

module.exports = config;