
var fs = require('fs')
var path = require('path')
var config = require('./config/private')

// file system backend
var galleryFolders = []
module.exports.galleryFolders = galleryFolders

fs.readdir(config.originalsPath, function (err, files) {
  if (err) throw err
  for (var i in files) {
    if (files[i].substring(0, 1) !== '.') {
      var albumFiles = fs.readdirSync(config.originalsPath + path.sep + files[i])
      for (var j in albumFiles) {
        if (albumFiles[j].substring(0, 1) !== '.') {
          galleryFolders.push(albumFiles[j])
        }
      }
    }
  }
})
