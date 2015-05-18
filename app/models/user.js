let mongoose = require('mongoose')
let bcrypt = require('bcrypt')
let nodeify = require('bluebird-nodeify')

require('songbird')

let userSchema = mongoose.Schema({
  local: {
      email: {
        type: String,
        required: false
      },
      password: {
        type: String,
        required: false
      }
   },
   facebook: {
      id: {
        type: String,
        required: false
      },
      token: {
        type: String,
        required: false
      },
      email: {
        type: String,
        required: false
      },
      name: {
        type: String,
        required: false
      }
   },
   twitter: {
      id: {
        type: String,
        required: false
      },
      token: {
        type: String,
        required: false
      },
      name: {
        type: String,
        required: false
      },
      username: {
        type: String,
        required: false
      }
   },
   google: {
      id: {
        type: String,
        required: false
      },
      token: {
        type: String,
        required: false
      },
      email: {
        type: String,
        required: false
      },
      name: {
        type: String,
        required: false
      }
   }

})

userSchema.methods.generateHash = async function(password) {
  throw new Error('Not Implemented.')
}

userSchema.methods.validatePassword = async function(password) {
  throw new Error('Not Implemented.')
}

userSchema.methods.linkAccount = function(type, values) {
  // linkAccount('facebook', ...) => linkFacebookAccount(values)
  return this['link'+_.capitalize(type)+'Account'](values)
}

userSchema.methods.linkLocalAccount = function({email, password}) {
  throw new Error('Not Implemented.')
}

userSchema.methods.linkFacebookAccount = function({account, token}) {
  throw new Error('Not Implemented.')
}

userSchema.methods.linkTwitterAccount = function({account, token}) {
  throw new Error('Not Implemented.')
}

userSchema.methods.linkGoogleAccount = function({account, token}) {
  throw new Error('Not Implemented.')
}

userSchema.methods.linkLinkedinAccount = function({account, token}) {
  throw new Error('Not Implemented.')
}

userSchema.methods.unlinkAccount = function(type) {
  throw new Error('Not Implemented.')
}

userSchema.methods.generateHash = async function (password) {
  return await bcrypt.promise.hash(password, 8)
}

userSchema.methods.validatePassword = async function (password) {
  return await bcrypt.promise.compare(password, this.local.password)
}

userSchema.pre('save', function(callback) {
  nodeify(async() => {
    if(!this.isModified('local.password')) return callback()
    this.local.password = await this.generateHash(this.local.password)
  }(), callback)
})

userSchema.path('local.password').validate(function(pw) {
  console.log("i am in validate method")
  return pw.length >= 4 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[0-9]/.test(pw)
})

module.exports = mongoose.model('User', userSchema)
