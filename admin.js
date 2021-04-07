'use strict'
var express = require('express')
var router = express.Router()
var fs = require('fs')

var app = require('./app')
var pages = require('./pages')
var filesystem = require('./filesystem')

router.use('/stop', function (req, res) {
  if (app.sessions[req.signedCookies.sid] === 'admin') {
    res.send('goodbye')
    app.server.close()
    process.exit()
  } else {
    res.send('403 Forbidden')
  }
})

router.use('/access', function (req, res) {
  if (app.sessions[req.signedCookies.sid] === 'admin') {
    pages.sendAdminAccess(res)
  } else {
    res.send('403 Forbidden')
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
    var userGalleries = {}

    if (req.body.user in app.galleries) {
      userGalleries = app.galleries[req.body.user]
    }
    if (req.body.value === 'true') {
      userGalleries[req.body.gallery] = true
    } else {
      userGalleries[req.body.gallery] = false
    }
    app.galleries[req.body.user] = Object.keys(userGalleries).sort().reverse().reduce((obj, key) => { obj[key] = userGalleries[key]; return obj; }, {});

    fs.writeFile('config/galleries.json', JSON.stringify(app.galleries), function (err) {
      if (err) {
        console.log('error writing gallery info: ' + err)
      }
      console.log('gallery info saved')
      //console.log(JSON.stringify(app.galleries))
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


router.use('/', function (req, res) {
  if (app.sessions[req.signedCookies.sid] === 'admin') {
    res.send('<a href="/admin/access">access</a> <a href="/admin/scan">scan</a> <a href="/admin/gpslist">gpslist</a>  <a href="/admin/visit">visit</a> <a href="/admin/stop">stop</a>')
  } else {
    res.send('403 Forbidden 2')
  }
})

module.exports = router
