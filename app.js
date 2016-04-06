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
    // console.log(req.body.name + ': ' + passHMAC)
    if (users[req.body.name.toLowerCase()] && users[req.body.name.toLowerCase()].pass === passHMAC) {
      sessions[req.signedCookies.sid] = req.body.name.toLowerCase()
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

httpListener.use('/admin/access', function (req, res) {
  if (sessions[req.signedCookies.sid] === 'admin') {
    var page = fs.readFileSync('template/photoadmin.html')
    page += '<section class="access-section"><div class="access-container"><table><tr><th><div>Gallery</div></th>'
    for (var userName in users) {
      page += '<th>' + userName + '<div>' + userName + '</div></th>'
    }
    page += '</tr>'

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
    // send list of available galleries
    var userName = sessions[req.signedCookies.sid]
    var content = '<div class="6"><ul class="listmain">'
    for (var galleryName in galleries[userName]) {
      if (galleries[userName][galleryName]) {
        content += '<li><a href="/' + galleryName + '"><span class="listlink">' +
        '<span class="listdate">' + galleryName.substring(0, 10) + '</span>' +
        '<span class="listtitle">' + galleryName.substring(11) + '</span></span></a>' +
        '<a href="/download/' + galleryName + '.zip"><i class="mdi mdi-download listdl btn"></i></a></li>'
      }
    }
    content += '</ul></div>'

    sendPage(res, '<link rel="stylesheet" type="text/css" href="/css/mainlist.css" media="all">', content, userName)
  } else {
    sendGalleryList(res, sessions[req.signedCookies.sid], gallerySelected)
  }
})

function sendPage (res, head, content, user) {
  fs.readFile('template/frame.html', 'utf-8', function (err, data) {
    if (err) {
      res.send('404')
    } else {
      var nav = ''
      if (user) {
        nav += '<div id="top"><a class="btnback" href="/"><i class="mdi mdi-keyboard-backspace btn"><span class="btntext">Back</span></i></a> ' +
        '<span id="toptitle">Photos</span><span id="topuser">' + user +
        '<a href="/settings"><i class="mdi mdi-settings btn"><span class="btntext">Settings</span></i></a> ' +
        '<a href="/logout"><i class="mdi mdi-logout btn"><span class="btntext">Sign out</span></i></a></span></div>'
      } else {
        nav += '<div id="top"><span id="toptitle">Login</span><span id="topuser"></span></div>'
      }
      res.contentType('text/html')
      res.send(data.replace('{{head}}', head).replace('{{content}}', nav + content))
    }
  })
}

function sendLoginPage (res, message) {
  var content = '<div class="center"><form method="post">' +
    '<h1>login</h1>' + message +
    '<input placeholder="Name" name="name" required="" type="text">' +
    '<input placeholder="Password" name="password" required="" type="password">' +
    '<button>Submit</button>' +
    '<div class="subtext"><a href="/resetpassword">Forgot your password?</a></div>' +
    '</form></div>'
  sendPage(res, '', content, false)
}

function sendSettingsPage (res, userName, message1, message2) {
  var content = '<div class="center"><form method="post">' +
    '<h1>change password</h1>' + message1 +
    '<input placeholder="Name" name="name" required="" type="text" value="' + userName + '" disabled>' +
    '<input placeholder="Old Password" name="password1" required="" type="password">' +
    '<input placeholder="New Password" name="password2" required="" type="password">' +
    '<button>Submit</button>' +
    '</form>' +
    '<form method="post">' +
    '<h1>change mail</h1>' + message2 +
    '<input placeholder="Name" name="name" required="" type="text" value="' + userName + '" disabled>' +
    '<input placeholder="Current Password" name="password1" required="" type="password">' +
    '<input placeholder="New Mail" name="mail" required="" type="text" value="' + users[userName].mail + '">' +
    '<button>Submit</button>' +
    '</form></div>'
  sendPage(res, '', content, userName)
}

function sendGalleryList (res, userName, galleryName) {
  if (!galleries[userName][galleryName]) {
    res.send('403 Forbidden 6')
  } else {
    fs.readdir(privateConfig.originalsPath + path.sep + galleryName.substring(0, 4) + path.sep + galleryName, function (err, files) {
      if (err) throw err
      var content = '<div class="listbox"><ul class="listmain">'
      var fileNames = ''
      var fileId = 0

      for (var i in files) {
        if (files[i].slice(-4) === '.jpg' || files[i].slice(-4) === '.jpeg') {
          fileNames += "'" + files[i] + "', "
          content += '<a class="thumb" href="/small/' + galleryName + '/' + files[i] + '" onclick="return show(\'' + fileId++ + '\')">' +
                '<img src="/thumb/' + galleryName + '/' + files[i] + '" alt="" /></a>'
        } else {
          content += '<a class="thumb" href="/original/' + galleryName + '/' + files[i] + '">' + files[i] + '</a>'
        }
      }

      content += '</ul></div>' +
        '<div id="imageview-container"><div id="imageview-nav">' +
          '<a href="#" onclick="downloadOriginal()"><i class="mdi mdi-download btn"></i></a>' +
          '<span id="imageview-play">' +
            '<a href="#" onclick="show(--currentId)"><i class="mdi mdi-chevron-left btn"></i></a>' +
            '<a href="#" onclick="play()"><i class="mdi mdi-play btn"></i></a>' +
          '<a href="#" onclick="show(++currentId)"><i class="mdi mdi-chevron-right btn"></i></a>' +
          '</span>' +
          '<span id="imageview-pause">' +
            '<a href="#" onclick="slower()"><i class="mdi mdi-minus btn"></i></a>' +
            '<a href="#" onclick="pause()"><i class="mdi mdi-pause btn"></i></a>' +
            '<a href="#" onclick="faster()"><i class="mdi mdi-plus btn"></i></a>' +
          '</span>' +
          '<a href="#" onclick="closeImage()"><i class="mdi mdi-close btn"></i></a>' +
        '</div>' +
        '<a href="#" onclick="closeImage()"><img id="imageview-image" src="" alt="" /></a></div>'

      sendPage(res, '<link href="/css/photoviewer.css" media="all" rel="stylesheet" type="text/css" />\n' +
        '<script type="text/javascript">\n' +
        'var galleryName = "' + galleryName + '"\n' +
        'var fileNames = [' + fileNames + ']\n' +
        '</script><script src="/photoviewer.js"></script>', content, userName)
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
      logger.exception(err)
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
