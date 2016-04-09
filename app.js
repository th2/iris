'use strict'

// config
var httpListenerPort = 80

// includes
var fs = require('fs')
var path = require('path')

var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser')
var express = require('express')

var router = require('./router')
var logger = require('./logger')
var filesystem = require('./filesystem')

var config = require('./config/private')
var users = require('./config/users')
module.exports.users = users
var galleries = require('./config/galleries')
module.exports.galleries = galleries
var sessions = {}
module.exports.sessions = sessions

// objects
var app = express()

// [http handler]
// use public folder, cookieParser and json bodyParser
app.use(express.static('public'))
app.use(cookieParser(config.cookieSecret))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

// use middleware for routing
app.use('/', router)

function startHttpListener (callback) {
  app.listen(httpListenerPort, function () {
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
      logger.exception(err)
    }
  })
}

startHttpListener(function () {})
