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