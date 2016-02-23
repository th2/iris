///// config /////
var httpListenerPort = 80;

///// includes /////
var express = require('express')
var util = require('util')
var logger = require('./logger')

///// objects /////
var httpListener = express()

///// http handler /////
httpListener.use(function (req, res, next) {
	logger.visitor(req.url, req.method, req.headers)
	next()
});

var visit = require('./visit');
httpListener.use('/visit', visit);

httpListener.use('/', function (req, res) {	
	res.send('Hello World!')
});

function startHttpListener() {
	httpListener.listen(httpListenerPort, function () {
		console.log('http handler listening on port '+httpListenerPort)
	}).on('error', function (err) {
		console.log('counld not start http handler on port '+httpListenerPort)
		if(httpListenerPort == 80)
			httpListenerPort = 8080
		else
			httpListenerPort++
		startHttpListener()
	});
}

startHttpListener()