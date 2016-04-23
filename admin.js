'use strict'
var express = require('express')
var router = express.Router()
var fs = require('fs')

var app = require('./app')
var pages = require('./pages')
var filesystem = require('./filesystem')

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

router.use('/access', function (req, res) {
  if (app.sessions[req.signedCookies.sid] === 'admin') {
    pages.sendAdminAccess(res)
  } else {
    res.send('403 Forbidden 1')
  }
})

var visit = require('./admin/visit')
router.use('/visit', visit)

router.use('/scan', function (req, res) {
  if (app.sessions[req.signedCookies.sid] === 'admin') {
    res.send('ok')
    filesystem.scanExif()
  } else {
    res.send('403 Forbidden')
  }
})

router.use('/set', function (req, res) {
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

router.use('/gpslist', function (req, res, next) {
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

module.exports = router
