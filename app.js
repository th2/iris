///// config /////
var httpListenerPort = 80;

///// includes /////
var express = require('express')
var util = require('util')
var logger = require('./logger')

///// objects /////
var httpListener = express()

///// http handler /////
httpListener.get('/', function (req, res) {
	logger.visitor(req.url, req.method, req.headers)
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