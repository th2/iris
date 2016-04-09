'use strict'
var crypto = require('crypto')
var express = require('express')
var router = express.Router()

var app = require('./app')
var config = require('./config/private')
var filesystem = require('./filesystem')
var fs = require('fs')
var logger = require('./logger')
var pages = require('./pages')
var path = require('path')

// admin panel
var visit = require('./admin/visit')
router.use('/admin/visit', visit)

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

router.use('/admin/access', function (req, res) {
  if (app.sessions[req.signedCookies.sid] === 'admin') {
    var page = fs.readFileSync('template/photoadmin.html')
    page += '<section class="access-section"><div class="access-container"><table><tr><th><div>Gallery</div></th>'
    for (var userName in users) {
      page += '<th>' + userName + '<div>' + userName + '</div></th>'
    }
    page += '</tr>'

    for (var folderID in filesystem.galleryFolders) {
      page += '<tr><td>' + filesystem.galleryFolders[folderID] + '</td>'

      for (var userId in users) {
        page += '<td><input type="button" name="' + filesystem.galleryFolders[folderID] + '|' + userId + '" value="'
        if (app.galleries[userId] !== undefined &&
            (filesystem.galleryFolders[folderID] in app.galleries[userId]) &&
            app.galleries[userId][filesystem.galleryFolders[folderID]]) {
          page += 'true'
        } else {
          page += 'false'
        }
        page += '" onclick="toggle(this)"></td>'
      }

      page += '<tr>'
    }
    page += '</table></body>'

    res.contentType('text/html')
    res.send(page)
  } else {
    res.send('403 Forbidden 1')
  }
})

router.use('/adminset', function (req, res) {
  if (app.sessions[req.signedCookies.sid] === 'admin') {
    if (!(req.body.user in app.galleries)) {
      app.galleries[req.body.user] = {}
    }
    if (req.body.value === 'true') {
      app.galleries[req.body.user][req.body.gallery] = true
    } else {
      app.galleries[req.body.user][req.body.gallery] = false
    }

    fs.writeFile('config/galleries.json', JSON.stringify(app.galleries), function (err) {
      if (err) {
        console.log('error writing gallery info: ' + err)
      }
      console.log('gallery info saved')
      console.log(JSON.stringify(app.galleries))
    })
  }
})

router.use('/download', function (req, res) {
  var galleryName = decodeURI(req.url).substring(1)
  if (galleryName.slice(-4) === '.zip') {
    galleryName = galleryName.substring(0, galleryName.length - 4)
  }
  if (app.galleries[app.sessions[req.signedCookies.sid]][galleryName]) {
    res.sendFile(galleryName + '.zip', { root: path.join(config.cachePath, 'zip', galleryName.substring(0, 4)) })
  } else {
    res.send('403 Forbidden 2')
  }
})

router.use('/original', function (req, res) {
  var filePath = decodeURI(req.url).substring(1).split('/')
  if (app.galleries[app.sessions[req.signedCookies.sid]][filePath[0]]) {
    res.sendFile(filePath[1], { root: path.join(config.originalsPath, filePath[0].substring(0, 4), filePath[0]) })
  } else {
    res.send('403 Forbidden 3')
  }
})

router.use('/small', function (req, res) {
  var filePath = decodeURI(req.url).substring(1).split('/')
  if (app.galleries[app.sessions[req.signedCookies.sid]][filePath[0]]) {
    res.sendFile(filePath[1], { root: path.join(config.cachePath, 'small', filePath[0].substring(0, 4), filePath[0]) })
  } else {
    res.send('403 Forbidden 4')
  }
})

router.use('/thumb', function (req, res) {
  var filePath = decodeURI(req.url).substring(1).split('/')
  if (app.galleries[app.sessions[req.signedCookies.sid]][filePath[0]]) {
    res.sendFile(filePath[1], { root: path.join(config.cachePath, 'thumb', filePath[0].substring(0, 4), filePath[0]) })
  } else {
    res.send('403 Forbidden 5')
  }
})

router.use('/', function (req, res) {
  var gallerySelected = decodeURI(req.url).substring(1)
  if (gallerySelected.length === 0 || gallerySelected === 'logout') {
    pages.sendMainList(res, app.sessions[req.signedCookies.sid])
  } else {
    pages.sendGalleryList(res, app.sessions[req.signedCookies.sid], gallerySelected)
  }
})

module.exports = router
