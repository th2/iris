'use strict'
var fs = require('fs')
var path = require('path')

var app = require('./app')
var config = require('./config/private')
var filesystem = require('./filesystem')

function sendPage (res, title, head, content, user, userFunctions) {
  fs.readFile('template/frame.html', 'utf-8', function (err, data) {
    if (err) {
      res.send('404')
    } else {
      var nav = ''
      if (title === '') title = 'Photos'
      if (user) {
        nav += '<div id="top"><a class="btnback" href="/"><i class="mdi mdi-keyboard-backspace btn"><span class="btntext">Back</span></i></a> ' +
        '<span id="toptitle">' + title + '</span><span id="topuser">' + userFunctions +
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
  sendPage(res, '', '', content, false, '')
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
  sendPage(res, '', '', content, userName, '')
}

// send list of available galleries
module.exports.sendMainList = function (res, userName) {
  var content = '<div class="listbox"><ul class="listmain">'
  for (var galleryName in app.galleries[userName]) {
    if (app.galleries[userName][galleryName]) {
      content += '<li><a href="/' + galleryName + '/"><span class="listlink">' +
      '<span class="listdate">' + galleryName.substring(0, 10) + '</span>' +
      '<span class="listtitle">' + galleryName.substring(11) + '</span></span></a>' +
      '<a href="/download/' + galleryName + '.zip"><i class="mdi mdi-download listdl btn"></i></a></li>'
    }
  }
  content += '</ul></div>'

  sendPage(res, '', '', content, userName, '')
}

module.exports.sendMainMap = function (res, userName) {
  var header = '<script src="http://maps.googleapis.com/maps/api/js?key=' + config.mapsKey + '"></script><script src="/map.js"></script>' +
    '<style>body, html { height: 100%; width: 100%; }</style>'
  var content = '<div id="map" style="width:100%; height:calc(100% - 58px);"></div>'

  sendPage(res, '', header, content, userName, '')
}

module.exports.sendGallery = function (res, userName, galleryName) {
  if (!app.galleries[userName][galleryName]) {
    res.send('403 Forbidden')
  } else {
    fs.readdir(config.originalsPath + path.sep + galleryName.substring(0, 4) + path.sep + galleryName, function (err, files) {
      if (err) throw err
      var fileNames = ''
      var fileId = 0
      var header = ''
      var content = ''

      if (app.users[userName].galleryViewMode === 'list') {
        content += '<div class="listbox"><ul class="listmain">'
        for (var i in files) {
          if (files[i].substring(0, 1) !== '.') {
            fileNames += "'" + files[i] + "', "
            content += '<li><a href="/small/' + galleryName + '/' + files[i] + '" onclick="return show(\'' + fileId++ + '\')">' +
            '<span class="listlink">' +
            '<span class="listtitle">' + files[i] + '</span></span></a>' +
            '<a href="/original/' + galleryName + '/' + files[i] + '"><i class="mdi mdi-download listdl btn"></i></a></li>'
          }
        }
        content += '</ul></div>'
      } else if (app.users[userName].galleryViewMode === 'map') {
        for (var i in files) {
          if (files[i].substring(0, 1) !== '.') {
            fileNames += "'" + files[i] + "', "
          }
        }
        header += '<script src="http://maps.googleapis.com/maps/api/js"></script><script src="/map.js"></script>' +
        '<style>body, html { height: 100%; width: 100%; }</style>'
        content += '<div id="map" style="width:100%; height:calc(100% - 58px);"></div>'
      } else { // app.users[userName].galleryViewMode === 'thumb'
        content += '<ul class="thumblist">'
        for (var i in files) {
          if (files[i].substring(0, 1) === '.') {

          } else if (files[i].slice(-4) === '.jpg' || files[i].slice(-5) === '.jpeg') {
            fileNames += "'" + files[i] + "', "
            content += '<a class="thumb" href="/small/' + galleryName + '/' + files[i] + '" onclick="return show(\'' + fileId++ + '\')">' +
                  '<img src="/thumb/' + galleryName + '/' + files[i] + '" alt="" /></a>'
          } else if (files[i].slice(-5) === '.heic') {
            let fileName = files[i]
            let nextFileName = files[parseInt(i) + 1]
            let isLivephoto = nextFileName === (fileName.slice(0, -5) + '.mov')

            fileNames += "'" + fileName + ".jpeg', "
            content += '<a class="thumb' + (isLivephoto ? ' livephoto' : '') + '" href="/small/' + galleryName + '/' + fileName + '.jpeg" onclick="return show(\'' + fileId++ + '\')">' +
                  '<img src="/thumb/' + galleryName + '/' + fileName + '.jpeg" alt="" /></a>'
          } else if (files[i].slice(-4) === '.mov') {
            let isLivephoto = (parseInt(i) > 0) && (files[i] === (files[parseInt(i) - 1].slice(0, -5) + '.mov'))
            if(!isLivephoto) {
              content += '<a class="thumb" href="/original/' + galleryName + '/' + files[i] + '">' + files[i] + '</a>'
            }
          } else {
            content += '<a class="thumb" href="/original/' + galleryName + '/' + files[i] + '">' + files[i] + '</a>'
          }
        }
        content += '</ul>'
      }

      content += '<div id="imageview-container"><div id="imageview-nav">' +
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

      var userFunctions = ''
      if (app.users[userName].galleryViewMode === 'list') {
        userFunctions += '<a href="/' + galleryName + '/map/"><i class="mdi mdi-google-maps btn"><span class="btntext">Map View</span></i></a> '
        userFunctions += '<a href="/' + galleryName + '/thumb/"><i class="mdi mdi-view-module btn"><span class="btntext">Icon View</span></i></a> '
      } else if (app.users[userName].galleryViewMode === 'map') {
        userFunctions += '<a href="/' + galleryName + '/thumb/"><i class="mdi mdi-view-module btn"><span class="btntext">Icon View</span></i></a> '
        userFunctions += '<a href="/' + galleryName + '/list/"><i class="mdi mdi-view-list btn"><span class="btntext">List View</span></i></a> '
      } else { // app.users[userName].galleryViewMode === 'thumb'
        userFunctions += '<a href="/' + galleryName + '/map/"><i class="mdi mdi-google-maps btn"><span class="btntext">Map View</span></i></a> '
        userFunctions += '<a href="/' + galleryName + '/list/"><i class="mdi mdi-view-list btn"><span class="btntext">List View</span></i></a> '
      }

      sendPage(res, galleryName, header + '<script type="text/javascript">\n' +
        'var galleryName = "' + galleryName + '"\n' +
        'var fileNames = [' + fileNames + ']\n' +
        '</script><script src="/hammer.min.js"></script><script src="/photoviewer.js"></script>', content, userName,
        userFunctions)
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
