///// config /////
var httpListenerPort = 80;

///// includes /////
var express = require('express')

///// objects /////
var httpListener = express()

///// http handler /////
httpListener.get('/', function (req, res) {
	res.send('Hello World!')
});

httpListener.listen(httpListenerPort, function () {
	console.log('http handler listening on port '+httpListenerPort)
});