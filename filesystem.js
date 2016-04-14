
var fs = require('fs')
var path = require('path')
var exif = require('fast-exif')
var logger = require('./logger')
var config = require('./config/private')

// file system backend
var galleryFolders = []
module.exports.galleryFolders = galleryFolders
var imageInfo = {}
module.exports.imageInfo = imageInfo

fs.readdir(config.originalsPath, function (err, files) {
  if (err) throw err
  for (var i in files) {
    if (files[i].substring(0, 1) !== '.') {
      var galleryFoldersNew = fs.readdirSync(path.join(config.originalsPath, files[i]))
      for (var j in galleryFoldersNew) {
        if (galleryFoldersNew[j].substring(0, 1) !== '.') {
          galleryFolders.push(galleryFoldersNew[j])
        }
      }
    }
  }
  
  scanExifAll()
})

function scanExifAll () {
  for (var folderId in galleryFolders) {
    imageInfo[galleryFolders[folderId]] = {}
    var galleryPath = path.join(config.originalsPath, galleryFolders[folderId].substring(0, 4), galleryFolders[folderId])
    var files = fs.readdirSync(galleryPath)

    for (var fileId in files) {
      if (files[fileId].substring(0, 1) !== '.' &&
         (files[fileId].slice(-4).toLowerCase() === '.jpg' || files[fileId].slice(-5).toLowerCase() === '.jpeg')) {
        imageInfo[galleryFolders[folderId]][files[fileId]] = {}
        scanExifSingleAsync(galleryPath, folderId, files[fileId])
      }
    }
  }
}

function scanExifSingleAsync (galleryPath, folderId, filename) {
  exif.read(path.join(galleryPath, filename)).catch(console.error).then(function (data) {
    imageInfo[galleryFolders[folderId]][filename] = data
  })
}
