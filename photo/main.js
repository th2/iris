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
  fs.readFile('photo/template/login.html', 'utf-8', function (err, data) {
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
    var page = fs.readFileSync('photo/photoadmin.html')
    page += '<table border="1"><th>'
    for (var userName in users) {
      page += '<td>' + userName + '</td>'
    }
    page += '</th>'

    for (var folderID in galleryFolders) {
      page += '<tr>'
      page += '<td>' + galleryFolders[folderID] + '</td>'

      for (var userId in users) {
        if (galleries[users[userId]] &&
            galleries[users[userId]].indexOf(galleryFolders[folderID]) > -1 &&
            galleries[users[userId]][galleryFolders[folderID]]) {
          page += '<td><input type="button" name="' +
          galleryFolders[folderID] + '|' + userId + '" value="true" onclick="toggle(this)"></td>'
        } else {
          page += '<td><input type="button" name="' +
          galleryFolders[folderID] + '|' + userId + '" value="false" onclick="toggle(this)"></td>'
        }
      }

      page += '<tr>'
    }
    page += '</table></body>'
    res.send(page)
  } else {
    res.send('403 Forbidden')
  }
})

router.use('/adminset', function (req, res) {
  if (sessions[req.signedCookies.sid] === 'admin') {
    if (!(req.body.user in galleries)) {
      galleries[req.body.user] = {}
    }
    galleries[req.body.user][req.body.gallery] = req.body.value
    fs.writeFile('config/galleries.json', JSON.stringify(galleries), function (err) {
      if (err) {
        console.log('error writing gallery info: ' + err)
      }
      console.log('It\'s saved!')
      console.log(JSON.stringify(galleries))
    })
  }
})

router.use('/', function (req, res) {
  fs.readFile('photo/template/mainlist.html', 'utf-8', function (err, data) {
    if (err) {
      res.send('404')
    } else {
      var listElement = ''
      for (var galeryName in galleries[sessions[req.signedCookies.sid]]) {
        listElement += '<li><a href="/photo/' + galeryName + '"><span class="listlink">' +
        '<span class="listdate">' + galeryName.substring(0, 10) + '</span>' +
        '<span class="listtitle">' + galeryName.substring(11) + '</span></span></a>' +
        '<a href="/photo/download/' + galeryName + '.zip"><i class="mdi mdi-download listdl btn"></i></a></li>'
      }

      res.contentType('text/html')
      res.send(data.replace('{{username}}', sessions[req.signedCookies.sid]).replace('{{list}}', listElement))
    }
  })
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