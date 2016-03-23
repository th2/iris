var express = require('express')
var router = express.Router()
var fs = require('fs')
var path = require('path')
var crypto = require('crypto')
var privateConfig = require('../config/private')
var users = require('../config/users')
var galleries = require('../config/galleries')

var sessions = {}

// access control
router.use(function (req, res, next) {
  if (req.signedCookies.sid in sessions) {
    next()
  } else if (req.body.name && req.body.name.length > 0) {
    var passHMAC = crypto.createHmac('sha512', privateConfig.passHMAC).update(req.body.password).digest('base64')
    if (users[req.body.name.toLowerCase()] && users[req.body.name.toLowerCase()].pass === passHMAC) {
      sessions[req.signedCookies.sid] = req.body.name.toLowerCase()
      next()
    } else {
      sendLoginPage(res, 'Wrong name or password.')
    }
  } else {
    sendLoginPage(res, '')
  }
})

function sendLoginPage (res, message) {
  fs.readFile('public/login.html', 'utf-8', function (err, data) {
    if (err) {
      res.send('404')
    } else {
      res.contentType('text/html')
      res.send(data.replace('{{m}}', message))
    }
  })
}

router.use('/admin', function (req, res) {
  if (sessions[req.signedCookies.sid] === 'admin') {
    res.send(galleryFolders)
  } else {
    res.send('403 Forbidden')
  }
})

router.use('/', function (req, res) {
  var galleryList = galleries[sessions[req.signedCookies.sid]]
  res.send(galleryList)
})

module.exports = router

// file system backend
var galleryFolders = []

fs.readdir(privateConfig.originalsPath, function (err, files) {
  if (err) throw err
  for (var i in files) {
    if (files[i].substring(0, 1) !== '.') {
      var albumFiles = fs.readdirSync(privateConfig.originalsPath + path.sep + files[i])
      for (var j in albumFiles) {
        if (albumFiles[j].substring(0, 1) !== '.') {
          galleryFolders.push(albumFiles[j])
        }
      }
    }
  }
})