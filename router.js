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

var cmd = require('./cmd')
router.use('/c', cmd)

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
  } else if (req.body.name) {
    // user sent credentials
    var passHMAC = crypto.createHmac('sha512', config.passHMAC).update(req.body.password).digest('base64')
    // console.log(req.body.name + ': ' + passHMAC)
    if (app.users[req.body.name.toLowerCase()] && app.users[req.body.name.toLowerCase()].pass === passHMAC) {
      app.sessions[req.signedCookies.sid] = req.body.name.toLowerCase()
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

router.use('/download', function (req, res) {
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

router.use('/', function (req, res) {
  var path = decodeURI(req.url).split('/')
  var gallerySelected = path[1]
  if (gallerySelected.length !== 0 &&
      !app.galleries[app.sessions[req.signedCookies.sid]][gallerySelected]) {
    res.send('403 Forbidden')
  } else {
    if (path[2] === 'mapdata') {
      res.send(map.cluster(filesystem.imageInfo[gallerySelected], 3))
    } else if (path[2] === 'list' || path[2] === 'map' || path[2] === 'thumb') {
      app.users[app.sessions[req.signedCookies.sid]].galleryViewMode = path[2]
      pages.sendGallery(res, app.sessions[req.signedCookies.sid], gallerySelected)
    } else if (gallerySelected.length === 0 || gallerySelected === 'logout') {
      pages.sendMainList(res, app.sessions[req.signedCookies.sid])
    } else { // unknown view mode, send selected gallery with previously selected view mode
      pages.sendGallery(res, app.sessions[req.signedCookies.sid], gallerySelected)
    }
  }
})

module.exports = router
