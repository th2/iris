///// config /////

///// includes /////
var util = require('util')

///// objects /////
var logger = {};

///// logger /////
logger.visitor = function(url, method, headers){
	console.log('headers: ' + util.inspect(headers))
	console.log('url: ' + url)
	console.log('method: ' + method)
}

module.exports = logger;