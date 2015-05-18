module.exports = {
	development: {
		'facebookAuth': {
			'clientID': '795705830526309',
			'clientSecret': '5e9fb09d7f85850617ec607f8f2bd271',
			'callbackURL': 'http://socialauthenticator.com:8000/auth/facebook/callback'
		},
		'googleAuth': {
			'clientID': '921069243042-aebtdrsmfndh5onjad3cvgqecr0o1i2f.apps.googleusercontent.com',
			'clientSecret': 's-YA43m8aEJ7JfmWoaxe6YQm',
			'callbackURL': 'http://socialauthenticator.com:8000/auth/google/callback'
		},
		'twitterAuth': {
			'consumerKey': 'MgOE2MzIbqA5beXNWiWyAz5qi',
			'consumerSecret': 'OY6hKPjEe5pnB9oOqiXF2KS6GsGSaFWEAm03fk7DwWCZydWMYI',
			'callbackURL': 'http://socialauthenticator.com:8000/auth/twitter/callback'
		}
	}

}
