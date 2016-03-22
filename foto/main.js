var express = require('express')
var router = express.Router()
var fs = require('fs')
var path = require('path')
var privateConfig = require('../config/private')
var users = require('../config/users')

var sessions = {}

// access control
router.use(function (req, res, next) {
  if (req.signedCookies.sid in sessions) {
    next()
  } else if (req.body.name && req.body.name.length > 0) {
    if (users[req.body.name.toLowerCase()] && users[req.body.name.toLowerCase()].pass === req.body.password) {
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

router.use('/', function (req, res) {
  res.send('ok')
  console.log(albums)
})

module.exports = router

// file system backend
var albums = []

fs.readdir(privateConfig.originalsPath, function (err, files) {
  if (err) throw err
  for (var i in files) {
    if (files[i].substring(0, 1) !== '.') {
      var albumFiles = fs.readdirSync(privateConfig.originalsPath + path.sep + files[i])
      for (var j in albumFiles) {
        if (albumFiles[j].substring(0, 1) !== '.') {
          albums.push(albumFiles[j])
        }
      }
    }
  }
})