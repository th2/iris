///// config /////

///// includes /////
var fs = require('fs')
var util = require('util')

///// objects /////
var logger = {}

///// logger /////
logger.visitor = function(url, method, cookie, headers){
	var visit = {}
	visit.url = url
	visit.method = method
	visit.cookie = cookie
	visit.headers = headers

	fs.appendFile('log/' + new Date().toISOString().slice(0, 10) + '.txt', JSON.stringify(visit) + ',', function(err){
		if(err) throw err
	});
}

module.exports = logger