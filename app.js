// config
var httpListenerPort = 80
// TODO: use protocol version
// var protocolVersion = 1

// includes
var http = require('http')
var express = require('express')
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser')
var util = require('util')
var logger = require('./logger')
var privateConfig = require('./config/private')
var knownHosts = require('./config/hosts')

// objects
var httpListener = express()

// [http handler]
// use public folder, cookieParser and json bodyParser
httpListener.use(express.static('public'))
httpListener.use(cookieParser(privateConfig.cookieSecret))
httpListener.use(bodyParser.urlencoded({ extended: true }))
httpListener.use(bodyParser.json())

// access logging
httpListener.use(function (req, res, next) {
  if (req.signedCookies.sid === undefined) {
    // set a new cookie
    var random = Math.random().toString(36).substring(2) + Date.now().toString(36)
    res.cookie('sid', random, { maxAge: 31536000, httpOnly: true, signed: true })
  }
  logger.visitor(req.url, req.method, req.signedCookies, req.headers)
  next()
})

// internal communication
var network = require('./network')
httpListener.use('/network', network)

// admin panel
var visit = require('./admin/visit')
httpListener.use('/admin', visit)

// photo gallery
var photo = require('./photo/main')
httpListener.use('/photo', photo)

// all other paths
httpListener.use('/', function (req, res) {
  res.send('Hello World!')
})

function startHttpListener (callback) {
  httpListener.listen(httpListenerPort, function () {
    console.log('http handler listening on port ' + httpListenerPort)
    callback()
  }).on('error', function (err) {
    if (err.errno === 'EACCES' || err.errno === 'EADDRINUSE') {
      console.log('counld not start http handler on port ' + httpListenerPort)
      if (httpListenerPort === 80) {
        httpListenerPort = 8080
      } else {
        httpListenerPort++
      }
      startHttpListener(callback)
    } else {
      logger.error(err)
    }
  })
}

/* function connectNetwork () {
  knownHosts.forEach(function (node) {
    var request = http.request({ host: node.host + ':' + node.port, path: '/network' }, function (response) {
      var page = ''

      response.on('data', function (chunk) {
        page += chunk
      })

      response.on('end', function () {
        if (page === 'ok') {
          node.connected = true
        } else {
          console.log('unexpected reply ' + page)
        }
      })
    })
    request.on('error', function (err) {
      if(err.errno === 'ENOTFOUND')
        node.online = false
      else
        logger.error(err)
    })
    request.end()
  })
}

startHttpListener(connectNetwork)*/

startHttpListener(function(){})
