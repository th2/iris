var fs = require('fs')
var path = require('path')

var app = require('./app')
var config = require('./config/private')
var filesystem = require('./filesystem')

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

module.exports.sendLoginPage = function (res, message) {
  var content = '<div class="center"><form method="post">' +
    '<h1>login</h1>' + message +
    '<input placeholder="Name" name="name" required="" type="text">' +
    '<input placeholder="Password" name="password" required="" type="password">' +
    '<button>Submit</button>' +
    '<div class="subtext"><a href="/resetpassword">Forgot your password?</a></div>' +
    '</form></div>'
  sendPage(res, '', content, false)
}

module.exports.sendSettingsPage = function (res, userName, message1, message2) {
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
    '<input placeholder="New Mail" name="mail" required="" type="text" value="' + app.users[userName].mail + '">' +
    '<button>Submit</button>' +
    '</form></div>'
  sendPage(res, '', content, userName)
}

// send list of available galleries
module.exports.sendMainList = function (res, userName) {
  var content = '<div class="6"><ul class="listmain">'
  for (var galleryName in app.galleries[userName]) {
    if (app.galleries[userName][galleryName]) {
      content += '<li><a href="/' + galleryName + '"><span class="listlink">' +
      '<span class="listdate">' + galleryName.substring(0, 10) + '</span>' +
      '<span class="listtitle">' + galleryName.substring(11) + '</span></span></a>' +
      '<a href="/download/' + galleryName + '.zip"><i class="mdi mdi-download listdl btn"></i></a></li>'
    }
  }
  content += '</ul></div>'

  sendPage(res, '<link rel="stylesheet" type="text/css" href="/css/mainlist.css" media="all">', content, userName)
}

module.exports.sendGalleryList = function (res, userName, galleryName) {
  if (!app.galleries[userName][galleryName]) {
    res.send('403 Forbidden 6')
  } else {
    fs.readdir(config.originalsPath + path.sep + galleryName.substring(0, 4) + path.sep + galleryName, function (err, files) {
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
        //'<img id="imageview-image" src="" alt="" /></a>'

      sendPage(res, '<link href="/css/photoviewer.css" media="all" rel="stylesheet" type="text/css" />\n' +
        '<script type="text/javascript">\n' +
        'var galleryName = "' + galleryName + '"\n' +
        'var fileNames = [' + fileNames + ']\n' +
        '</script><script src="/hammer.min.js"></script><script src="/photoviewer.js"></script>', content, userName)
    })
  }
}

module.exports.sendAdminAccess = function (res) {
  var page = fs.readFileSync('template/photoadmin.html')
  page += '<section class="access-section"><div class="access-container"><table><tr><th><div>Gallery</div></th>'
  for (var userName in app.users) {
    page += '<th>' + userName + '<div>' + userName + '</div></th>'
  }
  page += '</tr>'

  for (var folderID in filesystem.galleryFolders) {
    page += '<tr><td>' + filesystem.galleryFolders[folderID] + '</td>'

    for (var userId in app.users) {
      page += '<td><input type="button" name="' + filesystem.galleryFolders[folderID] + '|' + userId + '" value="'
      if (app.galleries[userId] !== undefined &&
          (filesystem.galleryFolders[folderID] in app.galleries[userId]) &&
          app.galleries[userId][filesystem.galleryFolders[folderID]]) {
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
}
