var express = require('express')
var router = express.Router()
var fs = require('fs')
var util = require('util')

router.get('/', function(req, res) {
	var visits = JSON.parse( '[' +
		fs.readFileSync('log/' + new Date().toISOString().slice(0, 10) + '.txt').slice(0, -1)
		+ ']' )
	var response = ''
	visits.forEach(function(entry) {
    	response += entry.url + ' ' + 
    		entry.method + ' ' +
    		util.inspect(entry.headers) + '<br>'
	})
	res.send(response)
})

router.get('/settings', function(req, res) {
	res.send('todo')
})

module.exports = router