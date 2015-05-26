let isLoggedIn = require('./middlewares/isLoggedIn')
//let posts = require('../data/posts')
let Twitter = require('twitter')
let then = require('express-then')
let FB = require('fb')
//let google = require('googleapis')
//let plus = google.plus('v1')
//let OAuth2 = google.auth.OAuth2
let Post = require('./models/post')
require('songbird')

module.exports = (app) => {
    let passport = app.passport
    let twitterConfig = app.config.auth.twitterAuth
    //let googleConfig = app.config.auth.googleAuth
    //let facebookConfig = app.config.auth.facebookAuth

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
    function getTwitterClient(req) {
        let twitterClient = new Twitter({
            consumer_key: twitterConfig.consumerKey,
            consumer_secret: twitterConfig.consumerSecret,
            access_token_key: req.user.twitter.token,
            access_token_secret: req.user.twitter.tokenSecret
        })
        return twitterClient
    }

    function getTweetPost(tweet) {
        return {
            id: tweet.id_str,
            image: tweet.user.profile_image_url,
            text: tweet.text,
            name: tweet.user.name,
            username: "@" + tweet.user.screen_name,
            liked: tweet.favorited,
            network: networks.twitter
        }
    }

    function createTweetPost(tweet, req) {
        let post = new Post()
        console.log('createTweetPost' + JSON.stringify(tweet))
        post.id = tweet.id_str
        post.image = tweet.user.profile_image_url
        post.text = tweet.text
        post.name = tweet.user.name
        post.username = "@" + tweet.user.screen_name
        post.liked = tweet.favorited
        post.network = networks.twitter
        post.account = req.user.twitter.username
        post.provider = networks.twitter.name
        post.save()
        return post
    }

    function getGPlusPost(activity) {
        return {
            id: activity.id,
            image: activity.actor.image.url,
            text: activity.object.content,
            name: activity.actor.displayName,
            username: activity.actor.displayName,
            liked: activity.object.plusoners.totalItems > 0 ? true : false,
            network: networks.google
        }
    }

    function getFBpostPost(fbfeed, req) {
        return {
            id: fbfeed.id,
            image: 'https://graph.facebook.com/v2.3/' + fbfeed.from.id + '/picture',
            text: fbfeed.message ? fbfeed.message : fbfeed.story,
            name: fbfeed.from.name,
            username: req.user.facebook.email,
            liked: fbfeed.likes ? true : false,
            network: networks.facebook,
            account: req.user.facebook.email
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

    app.get('/auth/facebook', passport.authenticate('facebook', {scope: 'email, publish_actions, user_posts, user_likes, read_stream'}))
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
        req.session.user = req.user
        let tweetPosts = await Post.getPosts(networks.twitter.name, req.user.twitter.username)

        let twitterClient = getTwitterClient(req)
        let tweets
        if(tweetPosts.length > 0) {
            [tweets] = await twitterClient.promise.get('statuses/home_timeline', {since_id: tweetPosts[0].id})
        } else {
            [tweets] = await twitterClient.promise.get('statuses/home_timeline')
        }

        tweets.forEach(tweet => {
            tweetPosts.push(createTweetPost(tweet, req))
        })

        // let googleOauth2Client = new OAuth2(googleConfig.clientID, googleConfig.clientSecret, googleConfig.callbackURL)
        // googleOauth2Client.setCredentials({
        //     access_token: req.user.google.token
        // })

        // let [activityResponse] = await plus.activities.promise.list({ userId: req.user.google.id, collection: 'public', auth: googleOauth2Client })
        // let gplusPosts = activityResponse.items.map(activity => {
        //     return getGPlusPost(activity)
        // })

        FB.setAccessToken(req.user.facebook.token)
        let response = await new Promise((resolve, reject) => FB.api('/me/feed', resolve))
        let fbPosts = response.data.map(fbfeed => {
            return getFBpostPost(fbfeed, req)
        })

        res.render('timeline.ejs', {
            //posts: tweetPosts.concat(gplusPosts).concat(fbPosts),
            posts: tweetPosts.concat(fbPosts),
            message: req.flash('error')
        })
    }))

    app.get('/compose', isLoggedIn, (req, res) => {
        res.render('compose.ejs')
    })

    app.get('/reply/:network/:id', isLoggedIn, then(async (req, res) => {
        let network = req.params.network
        let id = req.params.id
        let post
        if(network === "twitter") {
            let twitterClient = getTwitterClient(req)
            let [tweet] = await twitterClient.promise.get('statuses/show/' + id)
            post = getTweetPost(tweet)
        }
        if(network === "facebook"){
            FB.setAccessToken(req.user.facebook.token)
            let response = await new Promise((resolve, reject) => FB.api(id, resolve))
            console.log(JSON.stringify(response))
            post = getFBpostPost(response, req)
        }
        res.render('reply.ejs', {
            post: post
        })
    }))

    app.post('/reply/:network/:id', isLoggedIn, then(async (req, res) => {
        let network = req.params.network
        let id = req.params.id
        let reply = req.body.reply
        if(network === "twitter") {
            let twitterClient = getTwitterClient(req)
            await twitterClient.promise.post('statuses/update', {status: reply, in_reply_to_status_id: id})
        }
        if(network === "facebook"){
            FB.setAccessToken(req.user.facebook.token)
            await new Promise((resolve, reject) => FB.api(id+'/comments', 'post', {message: reply}, resolve))
        }
        res.redirect('/timeline')
    }))

    app.get('/share/:network/:id', isLoggedIn, then(async (req, res) => {
        let network = req.params.network
        let id = req.params.id
        let post
        if(network === "twitter") {
            let twitterClient = getTwitterClient(req)
            let [tweet] = await twitterClient.promise.get('statuses/show/' + id)
            post = getTweetPost(tweet)
        }
        if(network === "facebook"){
            FB.setAccessToken(req.user.facebook.token)
            let response = await new Promise((resolve, reject) => FB.api(id, resolve))
            console.log(JSON.stringify(response))
            post = getFBpostPost(response, req)
        }
        res.render('share.ejs', {
            post: post
        })
    }))

    app.post('/share/:network/:id', isLoggedIn, then(async (req, res) => {
        let network = req.params.network
        let id = req.params.id
        let share = req.body.share
        if(network === "twitter") {
            let twitterClient = getTwitterClient(req)
            await twitterClient.promise.post('statuses/retweet/' + id, {status: share})
        }
        if(network === "facebook"){
            let postId = id.split('_')
            FB.setAccessToken(req.user.facebook.token)
            let url = 'https://www.facebook.com/' + postId[0] + '/posts/' + postId[1]

            await new Promise((resolve, reject) => FB.api('me/feed', 'post', {link: url, message: share}, resolve))
        }
        res.redirect('/timeline')
    }))

    app.post('/compose', isLoggedIn, then(async (req, res) => {
        let twitterClient = getTwitterClient(req)
        FB.setAccessToken(req.user.facebook.token)

        let status = req.body.text
        console.log('status' + status)
        if(status.length > 140) {
            return req.flash('error', 'status is more than 140 chars')
        }

        if(!status) {
            return req.flash('error', 'status cannot be empty')
        }

        await twitterClient.promise.post('statuses/update', {status})
        await new Promise((resolve, reject) => FB.api('me/feed', 'post', {message: status}, resolve))

        res.redirect('/timeline')

    }))

    app.post('/like/:network/:id', isLoggedIn, then(async (req, res) => {
        let network = req.params.network
        let id = req.params.id
        if(network === "twitter"){
            let twitterClient = getTwitterClient(req)
            await twitterClient.promise.post('favorites/create', {id})
        }
        if(network === "facebook"){
            FB.setAccessToken(req.user.facebook.token)
            await new Promise((resolve, reject) => FB.api(id+'/likes', 'post', resolve))
        }
        res.end()
    }))

    app.post('/unlike/:network/:id', isLoggedIn, then(async (req, res) => {
        let network = req.params.network
        let id = req.params.id
        if(network === "twitter"){
            let twitterClient = getTwitterClient(req)
            await twitterClient.promise.post('favorites/destroy', {id})
        }
        if(network === "facebook"){
            FB.setAccessToken(req.user.facebook.token)
            await new Promise((resolve, reject) => FB.api(id+'/likes', 'delete', resolve))
        }
        res.end()
    }))
}
