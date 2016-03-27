var express = require('express')
var router = express.Router()
var fs = require('fs')
var path = require('path')
var crypto = require('crypto')
var privateConfig = require('../config/private')
var users = require('../config/users')
var galleries = require('../config/galleries')
var sessions = {}

router.use('/logout', function (req, res) {
  delete sessions[req.signedCookies.sid]
  sendLoginPage(res, 'Logout successful.')
})

// access control
router.use(function (req, res, next) {
  if (req.signedCookies.sid in sessions) {
    next()
  } else if (req.body.name) {
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

// settings page handler
router.use(function (req, res, next) {
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

router.use('/settings', function (req, res) {
  sendSettingsPage(res, sessions[req.signedCookies.sid], '', '')
})

router.use('/admin', function (req, res) {
  if (sessions[req.signedCookies.sid] === 'admin') {
    var page = fs.readFileSync('photo/photoadmin.html')
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

router.use('/download', function (req, res) {
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

router.use('/original', function (req, res) {
  var filePath = decodeURI(req.url).substring(1).split('/')
  if (galleries[sessions[req.signedCookies.sid]][filePath[0]]) {
    res.sendFile(filePath[1], { root: path.join(privateConfig.originalsPath, filePath[0].substring(0, 4), filePath[0]) })
  } else {
    res.send('403 Forbidden')
  }
})

router.use('/small', function (req, res) {
  var filePath = decodeURI(req.url).substring(1).split('/')
  if (galleries[sessions[req.signedCookies.sid]][filePath[0]]) {
    res.sendFile(filePath[1], { root: path.join(privateConfig.cachePath, 'small', filePath[0].substring(0, 4), filePath[0]) })
  } else {
    res.send('403 Forbidden')
  }
})

router.use('/thumb', function (req, res) {
  var filePath = decodeURI(req.url).substring(1).split('/')
  if (galleries[sessions[req.signedCookies.sid]][filePath[0]]) {
    res.sendFile(filePath[1], { root: path.join(privateConfig.cachePath, 'thumb', filePath[0].substring(0, 4), filePath[0]) })
  } else {
    res.send('403 Forbidden')
  }
})

router.use('/', function (req, res) {
  var galleryName = decodeURI(req.url).substring(1)
  if (galleryName.length === 0) {
    sendMainList(res, sessions[req.signedCookies.sid])
  } else {
    sendGalleryList(res, sessions[req.signedCookies.sid], galleryName)
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

function sendSettingsPage (res, userName, message1, message2) {
  fs.readFile('photo/template/settings.html', 'utf-8', function (err, data) {
    if (err) {
      res.send('404')
    } else {
      res.contentType('text/html')
      data = data.replace(/{{username}}/g, userName)
      data = data.replace('{{errormsg1}}', message1)
      data = data.replace('{{errormsg2}}', message2)
      if (users[userName])
        data = data.replace('{{usermail}}', users[userName].mail)
      res.send(data)
    }
  })
}

function sendMainList (res, userName) {
  fs.readFile('photo/template/mainlist.html', 'utf-8', function (err, data) {
    if (err) {
      res.send('404')
    } else {
      var listElement = ''
      for (var galleryName in galleries[userName]) {
        if (galleries[userName][galleryName]) {
          listElement += '<li><a href="/photos/' + galleryName + '"><span class="listlink">' +
          '<span class="listdate">' + galleryName.substring(0, 10) + '</span>' +
          '<span class="listtitle">' + galleryName.substring(11) + '</span></span></a>' +
          '<a href="/photos/download/' + galleryName + '.zip"><i class="mdi mdi-download listdl btn"></i></a></li>'
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
    fs.readFile('photo/template/photolist.html', 'utf-8', function (err, data) {
      if (err) {
        res.send('404')
      } else {
        fs.readdir(privateConfig.originalsPath + path.sep + galleryName.substring(0, 4) + path.sep + galleryName, function (err, files) {
          if (err) throw err
          var listElement = ''
          for (var i in files) {
            if (files[i].slice(-4) === '.jpg' || files[i].slice(-4) === '.jpeg') {
              listElement += '<a class="thumb" href="/photos/small/' + galleryName + '/' + files[i] + '" onclick="return viewer.show()">' +
                '<img src="/photos/thumb/' + galleryName + '/' + files[i] + '" alt="" /></a>'
            } else {
              listElement += '<a class="thumb" href="/photos/original/' + galleryName + '/' + files[i] + '" onclick="return viewer.show()">' +
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
