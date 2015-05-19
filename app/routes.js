let isLoggedIn = require('./middlewares/isLoggedIn')
//let posts = require('../data/posts')
let Twitter = require('twitter')
let then = require('express-then')
let google = require('googleapis')
let plus = google.plus('v1')
let OAuth2 = google.auth.OAuth2
require('songbird')

module.exports = (app) => {
    let passport = app.passport
    let twitterConfig = app.config.auth.twitterAuth
    let googleConfig = app.config.auth.googleAuth

    let networks = {
        facebook: {
            icon: 'facebook',
            name: 'Facebook',
            class: 'btn-primary'
        },
        twitter: {
            icon: 'twitter',
            name: 'Twitter',
            class: 'btn-info'
        },
        google: {
            icon: 'google-plus',
            name: 'Google',
            class: 'btn-danger'
        }
    }
    app.get('/', (req, res) => res.render('index.ejs'))

    app.get('/profile', isLoggedIn, (req, res) => {
        res.render('profile.ejs', {
            user: req.user,
            message: req.flash('error')
        })
    })

    app.get('/logout', (req, res) => {
        req.logout()
        res.redirect('/')
    })

    app.get('/login', (req, res) => {
        res.render('login.ejs', {message: req.flash('error')})
    })

    app.get('/signup', (req, res) => {
        res.render('signup.ejs', {message: req.flash('error') })
    })

    app.post('/login', passport.authenticate('local', {
		successRedirect: '/profile',
		failureRedirect: '/login',
		failureFlash: true
	}))

	app.post('/signup', passport.authenticate('local-signup', {
		successRedirect: '/profile',
		failureRedirect: '/signup',
		failureFlash: true
	}))

    let facebookScope = 'email'
    app.get('/auth/facebook', passport.authenticate('facebook', {facebookScope}))
    app.get('/auth/facebook/callback', passport.authenticate('facebook', {
        successRedirect: '/profile',
        failureRedirect: '/profile',
        failureFlash: true
    }))

    //let googleScope = ['email', 'profile']
    app.get('/auth/google', passport.authenticate('google', {scope: 'https://www.googleapis.com/auth/plus.login email'}))
    app.get('/auth/google/callback', passport.authenticate('google', {
        successRedirect: '/profile',
        failureRedirect: '/profile',
        failureFlash: true
    }))

    app.get('/auth/twitter', passport.authenticate('twitter'))
    app.get('/auth/twitter/callback', passport.authenticate('twitter', {
        successRedirect: '/profile',
        failureRedirect: '/profile',
        failureFlash: true
    }))

    app.get('/timeline', isLoggedIn, then(async (req, res) => {
        let twitterClient = new Twitter({
              consumer_key: twitterConfig.consumerKey,
              consumer_secret: twitterConfig.consumerSecret,
              access_token_key: req.user.twitter.token,
              access_token_secret: req.user.twitter.tokenSecret
        })

        let [tweets] = await twitterClient.promise.get('statuses/home_timeline')
        //console.log(tweets)

        tweets = tweets.map(tweet => {
            return {
                id: tweet.id_str,
                image: tweet.user.profile_image_url,
                text: tweet.text,
                name: tweet.user.name,
                username: "@" + tweet.user.screen_name,
                liked: tweet.favorited,
                network: networks.twitter
            }
        })

        let googleOauth2Client = new OAuth2(googleConfig.clientID, googleConfig.clientSecret, googleConfig.callbackURL)
        googleOauth2Client.setCredentials({
            access_token: req.user.google.token
        })

        let [activityResponse] = await plus.activities.promise.list({ userId: req.user.google.id, collection: 'public', auth: googleOauth2Client })
        let activities = activityResponse.items
        activities = activities.map (activity => {
            return {
                id: activity.id,
                image: activity.actor.image.url,
                text: activity.object.content,
                name: activity.actor.displayName,
                username: activity.actor.displayName,
                liked: activity.object.plusoners.totalItems > 0 ? true : false,
                network: networks.google
            }
        })

        res.render('timeline.ejs', {
            posts: tweets.concat(activities),
            message: req.flash('error')
        })
    }))

    app.get('/compose', isLoggedIn, (req, res) => {
        res.render('compose.ejs')
    })

    app.post('/compose', isLoggedIn, then(async (req, res) => {
        let twitterClient = new Twitter({
              consumer_key: twitterConfig.consumerKey,
              consumer_secret: twitterConfig.consumerSecret,
              access_token_key: req.user.twitter.token,
              access_token_secret: req.user.twitter.tokenSecret
        })

        let status = req.body.text
        console.log('status' + status)
        if(status.length > 140) {
            return req.flash('error', 'status is more than 140 chars')
        }

        if(!status) {
            return req.flash('error', 'status cannot be empty')
        }

        await twitterClient.promise.post('statuses/update', {status})

        res.redirect('/timeline')

    }))

    app.post('/like/:id', isLoggedIn, then(async (req, res) => {
        let twitterClient = new Twitter({
              consumer_key: twitterConfig.consumerKey,
              consumer_secret: twitterConfig.consumerSecret,
              access_token_key: req.user.twitter.token,
              access_token_secret: req.user.twitter.tokenSecret
        })

        let id = req.params.id
        console.log('id--->' + id)
        await twitterClient.promise.post('favorites/create', {id})

        res.end()

    }))

    app.post('/unlike/:id', isLoggedIn, then(async (req, res) => {
        let twitterClient = new Twitter({
              consumer_key: twitterConfig.consumerKey,
              consumer_secret: twitterConfig.consumerSecret,
              access_token_key: req.user.twitter.token,
              access_token_secret: req.user.twitter.tokenSecret
        })

        let id = req.params.id
        console.log('id--->' + id)
        await twitterClient.promise.post('favorites/destroy', {id})

        res.end()

    }))

}

