// config
var httpListenerPort = 80

// includes
var express = require('express')
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser')
var util = require('util')
var logger = require('./logger')
var secureConfig = require('./secure')

// objects
var httpListener = express()

// http handler

// cookie handling and access logging
httpListener.use(cookieParser(secureConfig.cookieSecret))
httpListener.use(bodyParser())
httpListener.use(function (req, res, next) {
  if (req.signedCookies.sid === undefined) {
    // set a new cookie
    var random = Math.random().toString(36).substring(2) + Date.now().toString(36)
    res.cookie('sid', random, { maxAge: 31536000, httpOnly: true, signed: true })
  }
  logger.visitor(req.url, req.method, req.signedCookies, req.headers)
  next()
})

// admin panel
var visit = require('./admin/visit')
httpListener.use('/admin', visit)

// all other paths
httpListener.use('/', function (req, res) {
  res.send('Hello World!')
})

function startHttpListener () {
  httpListener.listen(httpListenerPort, function () {
    console.log('http handler listening on port ' + httpListenerPort)
  }).on('error', function (err) {
    if (err.errno === 'EACCES') {
      console.log('counld not start http handler on port ' + httpListenerPort)
      if (httpListenerPort === 80) {
        httpListenerPort = 8080
      } else {
        httpListenerPort++
      }
      startHttpListener()
    } else {
      console.log(util.inspect(err))
    }
  })
}

startHttpListener()
