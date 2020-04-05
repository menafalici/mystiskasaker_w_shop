const express = require('express')
const User = require('../models/user')
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const router = express.Router()
const verifyToken = require("./verify")
const checkMsg = require('./message')
const crypto = require("crypto")
const config = require("../config/config")
const nodemailer = require("nodemailer")
const sendGridTransport = require("nodemailer-sendgrid-transport")

const transport = nodemailer.createTransport(sendGridTransport({
    auth: {
        api_key: config.mail
    }
}))

router.get("/signin", verifyToken, checkMsg, (req, res) => {
    res.render("shop/signin")
})

//Sign in 

router.post("/signin", async (req, res) => {

    const user = await User.findOne({
        email: req.body.email
    })

    if (!user) {
        res.cookie("message", "Din email är inte registrerad", {
            maxAge: 3600000,
            httpOnly: true
        })

        return res.redirect("/signin");
    }
    const validUser = await bcrypt.compare(req.body.password, user.password)

    if (!validUser) {
        res.cookie("message", "Fel lösenord", {
            maxAge: 3600000,
            httpOnly: true
        })

        return res.redirect("/signin");
    }
    jwt.sign({
        user
    }, "secretKey", (err, token) => {

        if (token) {
            const cookie = req.cookies.jsonwebtoken
            if (!cookie) {
                res.cookie("jsonwebtoken", token, {
                    maxAge: 3600000,
                    httpOnly: true
                })
            }
            return res.redirect("/profile")
        }

    })
})

//Create user

const salt = bcrypt.genSaltSync(10)

router.get("/signup", verifyToken, checkMsg, async (req, res) => {

    res.render("shop/signup")
})

router.post("/signup", async (req, res) => {

    if (req.body.firstname.length < 2) {
        res.cookie('message', 'Ogiltigt namn', {
            maxAge: 3600000,
            httpOnly: true
        })

        return res.redirect("/signup")
    }

    if (req.body.password.length < 6) {
        res.cookie('message', 'Ditt lösenord måste vara minst sex tecken långt', {
            maxAge: 3600000,
            httpOnly: true
        })
        return res.redirect("/signup")
    }

    User.findOne({
        email: req.body.email
    }).then(async user => {
        if (user) {
            res.cookie('message', 'Din email är redan registrerad', {
                maxAge: 3600000,
                httpOnly: true
            })

            return res.redirect("/signup")
        } else {
            const cryptPassword = await bcrypt.hash(req.body.password, salt)
            user = await new User({
                firstName: req.body.firstname,
                lastName: req.body.lastname,
                email: req.body.email,
                password: cryptPassword
            }).save()

            jwt.sign({
                user
            }, "secretKey", (err, token) => {
                if (token) {
                    const cookie = req.cookies.jsonwebtoken
                    if (!cookie) {
                        res.cookie("jsonwebtoken", token, {
                            maxAge: 3600000,
                            httpOnly: true
                        })
                    }
                    res.cookie('message', 'Woop woop, du är nu registrerad och inloggad', {
                        maxAge: 3600000,
                        httpOnly: true
                    })
                    return res.redirect("/profile")
                }
            })
        }
    })
})

//Reset password

router.get("/reset", function (req, res) {

    //To trigger modal

})

router.post("/reset", async (req, res) => {

    const user = await User.findOne({
        email: req.body.resetMail
    })
    if (!user) return res.redirect("/signup")

    crypto.randomBytes(32, async (err, token) => { //Skapar ett randomBytes token med 32 bytes
        if (err) return res.redirect("/signup")
        const resetToken = token.toString("hex")
        user.resetToken = resetToken
        user.expirationToken = Date.now() + 400000000
        await user.save()

        transport.sendMail({
            to: user.email,
            from: "<no-reply>info@mystiskasaker.se",
            subject: "Återställ ditt lösenord",
            html: `<h1> Återställningslänk: <a href="http://localhost:8000/reset/${resetToken}">Här</a></h1><br>
                    <h2>Kontakta kundtjänst om du inte har efterfrågat det här mejlet</h2>`
        })
        res.redirect("/signin")
    })

})

router.get("/reset/:token", verifyToken, checkMsg, async (req, res) => {
    //Om användare har token och den token är giltig då kan användare få ett formulär
    // req.params.token

    const user = await User.findOne({
        resetToken: req.params.token,
        expirationToken: {
            $gt: Date.now()
        }
    })

    if (!user) return res.redirect("/signup")

    res.render("shop/resetform")

})

router.post("/reset/:token", async (req, res) => {

    if (req.body.password !== req.body.password2) {
        res.cookie('message', 'Lösenorden stämmer inte överens', {
            maxAge: 3600000,
            httpOnly: true
        })
        return res.redirect("/reset/" + req.params.token)
    }

    if (req.body.password.length < 6) {
        res.cookie('message', 'Ditt lösenord måste vara minst sex tecken långt', {
            maxAge: 3600000,
            httpOnly: true
        })
        return res.redirect("/reset/" + req.params.token)
    }

    const user = await User.findOne({
        _id: req.body.userId
    })

    user.password = await bcrypt.hash(req.body.password, 10);
    user.resetToken = undefined;
    user.expirationToken = undefined;
    await user.save();

    res.redirect("/signin");
})

//Logout

router.get("/signout", (req, res) => {
    res.clearCookie("jsonwebtoken").redirect("/signin")
})

router.get("/profile", verifyToken, checkMsg, async (req, res) => {
    res.render("shop/profile")
})

//Update user information

router.post("/updateUserInfo/:id", verifyToken, async (req, res) => {

    await User.updateOne({ _id: req.params.id }, 
        {
            $set: {
                firstName: req.body.firstname,
                lastName: req.body.lastname,
                phone: req.body.phone,
                address: req.body.address,
                zipcode: req.body.zipcode,
                city: req.body.city
            }
        })

        res.redirect("/profile")
})

module.exports = router