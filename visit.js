var express = require('express')
var router = express.Router()
var fs = require('fs')
var util = require('util')
var secureConfig = require('./secure')

var authorized = []

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
	} else if(req.body.adminpw === secureConfig.adminPassword) {
		authorized.push(req.signedCookies.sid)
		next()
	} else {
		res.send('<form method="post" action="'+req.baseUrl+req.url+'">' +
			'<input type="password" name="adminpw">' +
			'<input type="submit" value="Submit">' +
			'</form>')
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