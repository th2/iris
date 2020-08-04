'use strict'
var crypto = require('crypto')
var express = require('express')
var router = express.Router()

var app = require('./app')
var config = require('./config/private')
var fs = require('fs')
var logger = require('./logger')
var map = require('./map')
var pages = require('./pages')
var filesystem = require('./filesystem')

// access logging
router.use(function (req, res, next) {
  if (req.signedCookies.sid === undefined) {
    // set a new cookie
    var random = Math.random().toString(36).substring(2) + Date.now().toString(36)
    res.cookie('sid', random, { maxAge: 31536000, httpOnly: true, signed: true })
  }
  logger.visitor(req, app.sessions[req.signedCookies.sid])
  next()
})

// logout page to handle session termination
router.use('/logout', function (req, res, next) {
  if (req.body.name) {
    // enable user login on logout page
    next()
  } else {
    // perform logout
    delete app.sessions[req.signedCookies.sid]
    pages.sendLoginPage(res, 'Logout successful.')
  }
})

// access control
router.use(function (req, res, next) {
  if (req.signedCookies.sid in app.sessions) {
    // user is logged in
    next()
  } else if ((req.body.name && req.body.password) || (req.query.name && req.query.password)) {
    var reqName = req.body.name ? req.body.name.toLowerCase() : req.query.name.toLowerCase()
    var reqPass = req.body.password ? req.body.password : req.query.password
    // user sent credentials
    var passHMAC = crypto.createHmac('sha512', config.passHMAC).update(reqPass).digest('base64')
    if (app.users[reqName] && app.users[reqName].pass === passHMAC) {
      app.sessions[req.signedCookies.sid] = reqName
      // corrent credentials
      next()
    } else {
      // incorrent credentials
      pages.sendLoginPage(res, 'Wrong name or password.')
    }
  } else {
    // user is not logged in and has sent no credentials
    pages.sendLoginPage(res, '')
  }
})

// settings page handler
router.use(function (req, res, next) {
  var userName = app.sessions[req.signedCookies.sid]
  if (req.body.password1) {
    var oldPassHMAC = crypto.createHmac('sha512', config.passHMAC).update(req.body.password1).digest('base64')

    if (req.body.password2) {
      if (app.users[userName].pass === oldPassHMAC) {
        app.users[userName].pass = crypto.createHmac('sha512', config.passHMAC).update(req.body.password2).digest('base64')
        fs.writeFile('config/users.json', JSON.stringify(app.users), function (err) { if (err) console.log('error writing users: ' + err) })
        next()
      } else {
        pages.sendSettingsPage(res, userName, 'Old password incorrect.', '')
      }
    } else if (req.body.mail) {
      if (app.users[userName].pass === oldPassHMAC) {
        app.users[userName].mail = req.body.mail
        fs.writeFile('config/users.json', JSON.stringify(app.users), function (err) { if (err) console.log('error writing users: ' + err) })
        next()
      } else {
        pages.sendSettingsPage(res, userName, '', 'Old password incorrect.')
      }
    } else {
      pages.sendSettingsPage(res, userName, '', '')
    }
  } else if (app.users[app.sessions[req.signedCookies.sid]].mail.length > 0) {
    next()
  } else {
    pages.sendSettingsPage(res, userName, '', 'Please set an e-mail address.')
  }
})

router.use('/settings', function (req, res) {
  pages.sendSettingsPage(res, app.sessions[req.signedCookies.sid], '', '')
})

// admin panel
var admin = require('./admin')
router.use('/admin', admin)

router.use('/download/:type', function (req, res) {
  filesystem.sendFile(req, res, 'zip')
})

router.use('/original', function (req, res) {
  filesystem.sendFile(req, res, 'original')
})

router.use('/small', function (req, res) {
  filesystem.sendFile(req, res, 'small')
})

router.use('/thumb', function (req, res) {
  filesystem.sendFile(req, res, 'thumb')
})

router.use('/map', function (req, res) {
  pages.sendMainMap(res, app.sessions[req.signedCookies.sid])
})

router.use('/mapdata', function (req, res) {
  var userName = app.sessions[req.signedCookies.sid]
  res.send(map.cluster(filesystem.getAllImageInfo(userName), 0))
})

router.use('/:galleryName/mapdata', function (req, res) {
  res.send(map.cluster(filesystem.imageInfo[req.params.galleryName], 3))
})

router.use('/:galleryName/:viewMode', function (req, res) {
  app.users[app.sessions[req.signedCookies.sid]].galleryViewMode = req.params.viewMode
  pages.sendGallery(res, app.sessions[req.signedCookies.sid], req.params.galleryName)
})

router.use('/:galleryName', function (req, res) {
  pages.sendGallery(res, app.sessions[req.signedCookies.sid], req.params.galleryName)
})

router.use('/', function (req, res) {
  pages.sendMainList(res, app.sessions[req.signedCookies.sid])
})

module.exports = router
