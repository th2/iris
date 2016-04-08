// config
var httpListenerPort = 80

// includes
var crypto = require('crypto')
var fs = require('fs')
var path = require('path')

var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser')
var express = require('express')

var logger = require('./logger')
var pages = require('./pages')
var filesystem = require('./filesystem')

var privateConfig = require('./config/private')
var users = require('./config/users')
module.exports.users = users
var galleries = require('./config/galleries')
module.exports.galleries = galleries
var sessions = {}

// objects
var httpListener = express()

// [http handler]
// use public folder, cookieParser and json bodyParser
httpListener.use(express.static('public'))
httpListener.use(cookieParser(privateConfig.cookieSecret))
httpListener.use(bodyParser.urlencoded({ extended: true }))
httpListener.use(bodyParser.json())

// admin panel
var visit = require('./admin/visit')
httpListener.use('/admin/visit', visit)

// access logging
httpListener.use(function (req, res, next) {
  if (req.signedCookies.sid === undefined) {
    // set a new cookie
    var random = Math.random().toString(36).substring(2) + Date.now().toString(36)
    res.cookie('sid', random, { maxAge: 31536000, httpOnly: true, signed: true })
  }
  logger.visitor(req, sessions[req.signedCookies.sid])
  next()
})

// logout page to handle session termination
httpListener.use('/logout', function (req, res, next) {
  if (req.body.name) {
    // enable user login on logout page
    next()
  } else {
    // perform logout
    delete sessions[req.signedCookies.sid]
    pages.sendLoginPage(res, 'Logout successful.')
  }
})

// access control
httpListener.use(function (req, res, next) {
  if (req.signedCookies.sid in sessions) {
    // user is logged in
    next()
  } else if (req.body.name) {
    // user sent credentials
    var passHMAC = crypto.createHmac('sha512', privateConfig.passHMAC).update(req.body.password).digest('base64')
    // console.log(req.body.name + ': ' + passHMAC)
    if (users[req.body.name.toLowerCase()] && users[req.body.name.toLowerCase()].pass === passHMAC) {
      sessions[req.signedCookies.sid] = req.body.name.toLowerCase()
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
httpListener.use(function (req, res, next) {
  var userName = sessions[req.signedCookies.sid]
  if (req.body.password1) {
    var oldPassHMAC = crypto.createHmac('sha512', privateConfig.passHMAC).update(req.body.password1).digest('base64')

    if (req.body.password2) {
      if (users[userName].pass === oldPassHMAC) {
        users[userName].pass = crypto.createHmac('sha512', privateConfig.passHMAC).update(req.body.password2).digest('base64')
        fs.writeFile('config/users.json', JSON.stringify(users), function (err) { if (err) console.log('error writing users: ' + err) })
        next()
      } else {
        pages.sendSettingsPage(res, userName, 'Old password incorrect.', '')
      }
    } else if (req.body.mail) {
      if (users[userName].pass === oldPassHMAC) {
        users[userName].mail = req.body.mail
        fs.writeFile('config/users.json', JSON.stringify(users), function (err) { if (err) console.log('error writing users: ' + err) })
        next()
      } else {
        pages.sendSettingsPage(res, userName, '', 'Old password incorrect.')
      }
    } else {
      pages.sendSettingsPage(res, userName, '', '')
    }
  } else if (users[sessions[req.signedCookies.sid]].mail.length > 0) {
    next()
  } else {
    pages.sendSettingsPage(res, userName, '', 'Please set an e-mail address.')
  }
})

httpListener.use('/settings', function (req, res) {
  pages.sendSettingsPage(res, sessions[req.signedCookies.sid], '', '')
})

httpListener.use('/admin/access', function (req, res) {
  if (sessions[req.signedCookies.sid] === 'admin') {
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
        if (galleries[userId] !== undefined &&
            (filesystem.galleryFolders[folderID] in galleries[userId]) &&
            galleries[userId][filesystem.galleryFolders[folderID]]) {
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

httpListener.use('/adminset', function (req, res) {
  if (sessions[req.signedCookies.sid] === 'admin') {
    if (!(req.body.user in galleries)) {
      galleries[req.body.user] = {}
    }
    if (req.body.value === 'true') {
      galleries[req.body.user][req.body.gallery] = true
    } else {
      galleries[req.body.user][req.body.gallery] = false
    }

    fs.writeFile('config/galleries.json', JSON.stringify(galleries), function (err) {
      if (err) {
        console.log('error writing gallery info: ' + err)
      }
      console.log('gallery info saved')
      console.log(JSON.stringify(galleries))
    })
  }
})

httpListener.use('/download', function (req, res) {
  var galleryName = decodeURI(req.url).substring(1)
  if (galleryName.slice(-4) === '.zip') {
    galleryName = galleryName.substring(0, galleryName.length - 4)
  }
  if (galleries[sessions[req.signedCookies.sid]][galleryName]) {
    res.sendFile(galleryName + '.zip', { root: path.join(privateConfig.cachePath, 'zip', galleryName.substring(0, 4)) })
  } else {
    res.send('403 Forbidden 2')
  }
})

httpListener.use('/original', function (req, res) {
  var filePath = decodeURI(req.url).substring(1).split('/')
  if (galleries[sessions[req.signedCookies.sid]][filePath[0]]) {
    res.sendFile(filePath[1], { root: path.join(privateConfig.originalsPath, filePath[0].substring(0, 4), filePath[0]) })
  } else {
    res.send('403 Forbidden 3')
  }
})

httpListener.use('/small', function (req, res) {
  var filePath = decodeURI(req.url).substring(1).split('/')
  if (galleries[sessions[req.signedCookies.sid]][filePath[0]]) {
    res.sendFile(filePath[1], { root: path.join(privateConfig.cachePath, 'small', filePath[0].substring(0, 4), filePath[0]) })
  } else {
    res.send('403 Forbidden 4')
  }
})

httpListener.use('/thumb', function (req, res) {
  var filePath = decodeURI(req.url).substring(1).split('/')
  if (galleries[sessions[req.signedCookies.sid]][filePath[0]]) {
    res.sendFile(filePath[1], { root: path.join(privateConfig.cachePath, 'thumb', filePath[0].substring(0, 4), filePath[0]) })
  } else {
    res.send('403 Forbidden 5')
  }
})

httpListener.use('/', function (req, res) {
  var gallerySelected = decodeURI(req.url).substring(1)
  if (gallerySelected.length === 0 || gallerySelected === 'logout') {
    pages.sendMainList(res, sessions[req.signedCookies.sid])
  } else {
    pages.sendGalleryList(res, sessions[req.signedCookies.sid], gallerySelected)
  }
})

function startHttpListener (callback) {
  httpListener.listen(httpListenerPort, function () {
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
