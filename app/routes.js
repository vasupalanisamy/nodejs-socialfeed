let isLoggedIn = require('./middlewares/isLoggedIn')
module.exports = (app) => {
    let passport = app.passport

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
}

