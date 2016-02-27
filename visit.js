var express = require('express')
var router = express.Router()
var fs = require('fs')
var util = require('util')
var secureConfig = require('./secure')

var authorized = []
var invalidLoginAttempts = 0
var lastLoginAttempt = 0

Array.prototype.contains = function(obj) {
    var i = this.length;
    while (i--) {
        if (this[i] === obj) {
            return true;
        }
    }
    return false;
}

// check if user is authorized
router.use(function (req, res, next) {
	if (authorized.contains(req.signedCookies.sid)) {
		next()
	} else if(10000 * invalidLoginAttempts + lastLoginAttempt > new Date().getTime()) {
		res.send('wait for ' + 
			Math.floor((10000 * invalidLoginAttempts + lastLoginAttempt - new Date().getTime())/1000)
			+ ' seconds')
	} else if(req.body.adminpw === secureConfig.adminPassword) {
		authorized.push(req.signedCookies.sid)
		invalidLoginAttempts = 0
		next()
	} else {
		var response = ''
		if(req.body.adminpw && req.body.adminpw.length > 0) {
			response += 'wrong password'
			invalidLoginAttempts++
			lastLoginAttempt = new Date().getTime()
		} else {
			response += '<form method="post" action="'+req.baseUrl+req.url+'">' +
				'<input type="password" name="adminpw">' +
				'<input type="submit" value="Submit">' +
				'</form>'
		}
		res.send(response)
    }
})

router.get('/', function(req, res) {
	var visits = JSON.parse( '[' +
		fs.readFileSync('log/' + new Date().toISOString().slice(0, 10) + '.txt').slice(0, -1)
		+ ']' )
	var response = ''
	visits.forEach(function(entry) {
    	response += 
    		new Date(entry.date).toISOString() + ' ' +
    		entry.url + ' ' +
    		entry.method + ' ' +
    		entry.cookie + ' ' +
    		util.inspect(entry.headers) + '<br>'
	})
	res.send(response)
})

router.get('/settings', function(req, res) {
	res.send('todo')
})

module.exports = router