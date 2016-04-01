// config
var httpListenerPort = 80

// includes
var fs = require('fs')
var express = require('express')
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser')
var path = require('path')
var crypto = require('crypto')
var dateFormat = require('dateformat')
var logger = require('./logger')

var privateConfig = require('./config/private')
var users = require('./config/users')
var galleries = require('./config/galleries')
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
httpListener.use('/admin', visit)

// access logging
httpListener.use(function (req, res, next) {
  if (req.signedCookies.sid === undefined) {
    // set a new cookie
    var random = Math.random().toString(36).substring(2) + Date.now().toString(36)
    res.cookie('sid', random, { maxAge: 31536000, httpOnly: true, signed: true })
  }
  logger.visitor(req)
  next()
})

// logout page to handle session termination
httpListener.use('/logout', function (req, res, next) {
  if (req.body.name) {
    // enable user login on logout page
    next()
  } else {
    // perform logout
    logSession(req.signedCookies.sid, false)
    delete sessions[req.signedCookies.sid]
    sendLoginPage(res, 'Logout successful.')
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
    if (users[req.body.name.toLowerCase()] && users[req.body.name.toLowerCase()].pass === passHMAC) {
      sessions[req.signedCookies.sid] = req.body.name.toLowerCase()
      logSession(req.signedCookies.sid, true)
      // corrent credentials
      next()
    } else {
      // incorrent credentials
      sendLoginPage(res, 'Wrong name or password.')
    }
  } else {
    // user is not logged in and has sent no credentials
    sendLoginPage(res, '')
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
        sendSettingsPage(res, userName, 'Old password incorrect.', '')
      }
    } else if (req.body.mail) {
      if (users[userName].pass === oldPassHMAC) {
        users[userName].mail = req.body.mail
        fs.writeFile('config/users.json', JSON.stringify(users), function (err) { if (err) console.log('error writing users: ' + err) })
        next()
      } else {
        sendSettingsPage(res, userName, '', 'Old password incorrect.')
      }
    } else {
      sendSettingsPage(res, userName, '', '')
    }
  } else if (users[sessions[req.signedCookies.sid]].mail.length > 0) {
    next()
  } else {
    sendSettingsPage(res, userName, '', 'Please set an e-mail address.')
  }
})

httpListener.use('/settings', function (req, res) {
  sendSettingsPage(res, sessions[req.signedCookies.sid], '', '')
})

httpListener.use('/admin', function (req, res) {
  if (sessions[req.signedCookies.sid] === 'admin') {
    var page = fs.readFileSync('template/photoadmin.html')
    page += '<table border="1"><th>'
    for (var userName in users) {
      page += '<td>' + userName + '</td>'
    }
    page += '</th>'

    for (var folderID in galleryFolders) {
      page += '<tr><td>' + galleryFolders[folderID] + '</td>'

      for (var userId in users) {
        page += '<td><input type="button" name="' + galleryFolders[folderID] + '|' + userId + '" value="'
        if (galleries[userId] !== undefined &&
            (galleryFolders[folderID] in galleries[userId]) &&
            galleries[userId][galleryFolders[folderID]]) {
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
    res.send('403 Forbidden')
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
    res.send('403 Forbidden')
  }
})

httpListener.use('/original', function (req, res) {
  var filePath = decodeURI(req.url).substring(1).split('/')
  if (galleries[sessions[req.signedCookies.sid]][filePath[0]]) {
    res.sendFile(filePath[1], { root: path.join(privateConfig.originalsPath, filePath[0].substring(0, 4), filePath[0]) })
  } else {
    res.send('403 Forbidden')
  }
})

httpListener.use('/small', function (req, res) {
  var filePath = decodeURI(req.url).substring(1).split('/')
  if (galleries[sessions[req.signedCookies.sid]][filePath[0]]) {
    res.sendFile(filePath[1], { root: path.join(privateConfig.cachePath, 'small', filePath[0].substring(0, 4), filePath[0]) })
  } else {
    res.send('403 Forbidden')
  }
})

httpListener.use('/thumb', function (req, res) {
  var filePath = decodeURI(req.url).substring(1).split('/')
  if (galleries[sessions[req.signedCookies.sid]][filePath[0]]) {
    res.sendFile(filePath[1], { root: path.join(privateConfig.cachePath, 'thumb', filePath[0].substring(0, 4), filePath[0]) })
  } else {
    res.send('403 Forbidden')
  }
})

httpListener.use('/', function (req, res) {
  var galleryName = decodeURI(req.url).substring(1)
  if (galleryName.length === 0 || galleryName === 'logout') {
    sendMainList(res, sessions[req.signedCookies.sid])
  } else {
    sendGalleryList(res, sessions[req.signedCookies.sid], galleryName)
  }
})

function sendLoginPage (res, message) {
  fs.readFile('template/login.html', 'utf-8', function (err, data) {
    if (err) {
      res.send('404')
    } else {
      res.contentType('text/html')
      res.send(data.replace('{{m}}', message))
    }
  })
}

function sendSettingsPage (res, userName, message1, message2) {
  fs.readFile('template/settings.html', 'utf-8', function (err, data) {
    if (err) {
      res.send('404')
    } else {
      res.contentType('text/html')
      data = data.replace(/{{username}}/g, userName)
      data = data.replace('{{errormsg1}}', message1)
      data = data.replace('{{errormsg2}}', message2)
      if (users[userName]) {
        data = data.replace('{{usermail}}', users[userName].mail)
      }
      res.send(data)
    }
  })
}

function sendMainList (res, userName) {
  fs.readFile('template/mainlist.html', 'utf-8', function (err, data) {
    if (err) {
      res.send('404')
    } else {
      var listElement = ''
      for (var galleryName in galleries[userName]) {
        if (galleries[userName][galleryName]) {
          listElement += '<li><a href="/' + galleryName + '"><span class="listlink">' +
          '<span class="listdate">' + galleryName.substring(0, 10) + '</span>' +
          '<span class="listtitle">' + galleryName.substring(11) + '</span></span></a>' +
          '<a href="/download/' + galleryName + '.zip"><i class="mdi mdi-download listdl btn"></i></a></li>'
        }
      }

      res.contentType('text/html')
      res.send(data.replace('{{username}}', userName).replace('{{list}}', listElement))
    }
  })
}

function sendGalleryList (res, userName, galleryName) {
  if (!galleries[userName][galleryName]) {
    res.send('403 Forbidden')
  } else {
    fs.readFile('template/photolist.html', 'utf-8', function (err, data) {
      if (err) {
        res.send('404')
      } else {
        fs.readdir(privateConfig.originalsPath + path.sep + galleryName.substring(0, 4) + path.sep + galleryName, function (err, files) {
          if (err) throw err
          var listElement = ''
          for (var i in files) {
            if (files[i].slice(-4) === '.jpg' || files[i].slice(-4) === '.jpeg') {
              listElement += '<a class="thumb" href="/small/' + galleryName + '/' + files[i] + '" onclick="return viewer.show()">' +
                '<img src="/thumb/' + galleryName + '/' + files[i] + '" alt="" /></a>'
            } else {
              listElement += '<a class="thumb" href="/original/' + galleryName + '/' + files[i] + '" onclick="return viewer.show()">' +
                files[i] + '</a>'
            }
          }
          res.contentType('text/html')
          res.send(data.replace('{{username}}', userName).replace('{{list}}', listElement))
        })
      }
    })
  }
}

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
      logger.error(err)
    }
  })
}

startHttpListener(function () {})

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

function logSession (sessionId, start) {
  var session = {}
  session.time = new Date()
  session.sid = sessionId
  session.user = sessions[sessionId]
  session.start = start

  fs.appendFile('log/session/' + dateFormat(new Date(), 'yyyy-mm-dd') + '.json', JSON.stringify(session) + ',', function (err) {
    if (err) throw err
  })
}

