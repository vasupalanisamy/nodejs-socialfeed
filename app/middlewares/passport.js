let passport = require('passport')
let nodeifyit = require('nodeifyit')
let User = require('../models/user')
let util = require('util')
let LocalStrategy = require('passport-local').Strategy
let FacebookStrategy = require('passport-facebook').Strategy
let GoogleStrategy = require('passport-google-oauth').OAuth2Strategy
let TwitterStrategy = require('passport-twitter').Strategy

require('songbird')


function useExternalPassportStrategy(OauthStrategy, config, field) {
  config.passReqToCallback = true
  console.log('configuring....' + field)
  passport.use(field, new OauthStrategy(config, nodeifyit(authCB, {spread: true})))

  // 1. Load user from store
  // 2. If req.user exists, we're authorizing (connecting an account)
  // 2a. Ensure it's not associated with another account
  // 2b. Link account
  // 3. If not, we're authenticating (logging in)
  // 3a. If user exists, we're logging in via the 3rd party account
  // 3b. Otherwise create a user associated with the 3rd party account
  async function authCB(req, token, tokenSecret, account) {
    console.log('req.user-->' + req.user)
    console.log('token-->' + token)
    console.log('tokenSecret-->' + tokenSecret)
    console.log('account-->' + JSON.stringify(account))
    let idField = field + '.id'
    let query = {}
    query[idField] = account.id
    console.log('query-->' + JSON.stringify(query))
    let dbUser = await User.promise.findOne({query})
    let user = req.user
    //User is authenticated locally
    if (user) {
      if (dbUser && (dbUser.id !== user.id)) {
        console.log('account associated to some other user - ' + dbUser.id)
        return [false, {message: "account associated to some other user"}]
      }
    } else {
      if(dbUser) {
        console.log('dbUser.id if block' + dbUser.id)
        //Logged in using social account
        user = dbUser
      } else {
        console.log('dbUser.id else block' + dbUser)
        //Creating the account for social login
        user = new User()
      }
    }
    user[field].id = account.id
    user[field].token = token
    user[field].tokenSecret = tokenSecret
    if(field === 'twitter') {
      user[field].username = account.username
    } else {
      user[field].email = account.emails[0].value
    }

    user[field].name = account.displayName
    console.log('updateSocialAccountInfo' + user)
    try{
      return await user.save()
    }catch(excep){
      console.log(util.inspect(excep))
      return [false, {message: excep.message}]
    }
  }
}

function configure(config) {
  // Required for session support / persistent login sessions
  passport.serializeUser(nodeifyit(async (user) => user._id))
  passport.deserializeUser(nodeifyit(async (id) => {
      return await User.promise.findById(id)
  }))

  console.log('config...' + config)
  useExternalPassportStrategy(FacebookStrategy, config.facebookAuth, 'facebook')
  useExternalPassportStrategy(GoogleStrategy, config.googleAuth, 'google')
  useExternalPassportStrategy(TwitterStrategy, config.twitterAuth, 'twitter')

  passport.use(new LocalStrategy({
      usernameField: 'email',
      failureFlash: true
  }, nodeifyit(async (email, password) => {
      let regExQuery
      let regExp = new RegExp(email, "i")
      regExQuery = {'local.email': {$regex: regExp}}
      let user = await User.promise.findOne(regExQuery)
      console.log("user" + user)
      if(!user) {
          return [false, {message: 'Invalid username or password'}]
      }
      if(!await user.validatePassword(password)) {
          return [false, {message: 'Invalid password'}]
      }
      return user
  }, {spread: true})))

  passport.use('local-signup', new LocalStrategy({
    usernameField: 'email',
      passReqToCallback: true
  }, nodeifyit(async (req, email, password) => {
      let emailRegExp = new RegExp(email, "i")
      let emailRegExQuery = {'local.email': {$regex: emailRegExp}}
      if(!email.indexOf('@')){
          return [false, {message: 'The email is invalid'}]
      }
      if(await User.promise.findOne(emailRegExQuery)){
        return [false, {message: 'The email is already taken'}]
      }
      let user
      if(req.user) {
        user = req.user
      } else {
        user = new User()
      }

      user.local.email = email
      user.local.password = password
      try {
          return await user.save()
      } catch (e) {
          console.log('Validation error', e)
          return [false, {message: e.message}]
      }
  }, {spread: true})))

  return passport
}

module.exports = {passport, configure}
