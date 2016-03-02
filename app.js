// config
var httpListenerPort = 80
// TODO: use protocol version
// var protocolVersion = 1

// includes
var http = require('http')
var express = require('express')
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser')
var ursa = require('ursa')
var util = require('util')
var logger = require('./logger')
var secureConfig = require('./secure')
var knownHosts = require('./hosts')

// objects
var httpListener = express()
var rsaKey = ursa.createPrivateKey(secureConfig.privateKey)

// [http handler]
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

// internal communication
var network = require('./network')
httpListener.use('/network', network)

// admin panel
var visit = require('./admin/visit')
httpListener.use('/admin', visit)

// all other paths
httpListener.use('/', function (req, res) {
  res.send('Hello World!')
})

function startHttpListener (callback) {
  httpListener.listen(httpListenerPort, function () {
    console.log('http handler listening on port ' + httpListenerPort)

    // TODO: remove test config:
    if (httpListenerPort === 8081) {
      var secureConfig1 = require('./secure1')
      rsaKey = ursa.createPrivateKey(secureConfig1.privateKey)
    }

    callback()
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

function connectNetwork () {
  knownHosts.forEach(function (node) {
    http.request({ host: node.host + ':' + node.port, path: '/network' }, function (response) {
      var page = ''

      response.on('data', function (chunk) {
        page += chunk
      })

      response.on('end', function () {
        console.log(page)
      })
    }).end()
  })
}

startHttpListener(connectNetwork())
