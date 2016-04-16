'use strict'
var crypto = require('crypto')
var express = require('express')
var router = express.Router()
var path = require('path')

var app = require('./app')
var config = require('./config/private')
var fs = require('fs')
var logger = require('./logger')
var pages = require('./pages')
var filesystem = require('./filesystem')

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

// stop the server
router.use('/stop', function (req, res) {
  if (app.sessions[req.signedCookies.sid] === 'admin') {
    res.send('goodbye')
    app.server.close()
    process.exit()
  } else {
    res.send('403 Forbidden 1')
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
    pages.sendAdminAccess(res)
  } else {
    res.send('403 Forbidden 1')
  }
})

router.use('/admin/scan', function (req, res) {
  if (app.sessions[req.signedCookies.sid] === 'admin') {
    res.send('ok')
    filesystem.scanExif()
  } else {
    res.send('403 Forbidden')
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
  sendFile(req, res, 'zip')
})

router.use('/original', function (req, res) {
  sendFile(req, res, 'original')
})

router.use('/small', function (req, res) {
  sendFile(req, res, 'small')
})

router.use('/thumb', function (req, res) {
  sendFile(req, res, 'thumb')
})

function sendFile (req, res, kind) {
  var filePath = decodeURI(req.url).substring(1).split('/')
  // remove .zip extension
  if (kind === 'zip' && filePath[0].slice(-4) === '.zip') {
    filePath[0] = filePath[0].substring(0, filePath[0].length - 4)
  }

  // check if user is authorized to access the file
  if (app.galleries[app.sessions[req.signedCookies.sid]][filePath[0]]) {
    if (kind === 'zip') {
      res.sendFile(filePath[0] + '.zip', { root: path.join(config.cachePath, 'zip', filePath[0].substring(0, 4)) })
    } else if (kind === 'original') {
      res.sendFile(filePath[1], { root: path.join(config.originalsPath, filePath[0].substring(0, 4), filePath[0]) })
    } else { // kind is small or thumb
      res.sendFile(filePath[1], { root: path.join(config.cachePath, kind, filePath[0].substring(0, 4), filePath[0]) })
    }
  } else {
    res.send('403 Forbidden 5')
  }
}

router.use('/gps', function (req, res, next) {
  if (app.sessions[req.signedCookies.sid] === 'admin') {
    var response = ''
    for (var imageId in filesystem.imageInfo) {
      var image = filesystem.imageInfo[imageId]
      response += image.gallery + '/' + image.name + ' '
      if (image.exif) {
        response += image.exif.GPSLatitudeRef + ' ' + image.exif.GPSLatitude + ' ' +
        image.exif.GPSLongitudeRef + ' ' + image.exif.GPSLongitude + '<br>'
      } else {
        response += 'not set<br>'
      }
    }
    res.send(response)
  } else {
    res.send('403 Forbidden')
  }
})

router.use('/', function (req, res) {
  var gallerySelected = decodeURI(req.url).split('/')[1]
  if (decodeURI(req.url).split('/')[2] === 'list' || decodeURI(req.url).split('/')[2] === 'thumb') {
    app.users[app.sessions[req.signedCookies.sid]].galleryViewMode = decodeURI(req.url).split('/')[2]
  }

  if (gallerySelected.length === 0 || gallerySelected === 'logout') {
    pages.sendMainList(res, app.sessions[req.signedCookies.sid])
  } else {
    pages.sendGalleryList(res, app.sessions[req.signedCookies.sid], gallerySelected)
  }
})

module.exports = router
