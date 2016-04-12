
var fs = require('fs')
var path = require('path')
var Exif = require('exif').ExifImage
var logger = require('./logger')
var config = require('./config/private')

// file system backend
var galleryFolders = []
module.exports.galleryFolders = galleryFolders
var imageInfo = {}

fs.readdir(config.originalsPath, function (err, files) {
  if (err) throw err
  for (var i in files) {
    if (files[i].substring(0, 1) !== '.') {
      var albumFiles = fs.readdirSync(path.join(config.originalsPath, files[i]))
      for (var j in albumFiles) {
        if (albumFiles[j].substring(0, 1) !== '.') {
          galleryFolders.push(albumFiles[j])
        }
      }
    }
  }

  scanImages()
})

function scanImages () {
  for (var folderId in galleryFolders) {
    imageInfo[galleryFolders[folderId]] = {}
    var dirPath = path.join(config.originalsPath, galleryFolders[folderId].substring(0, 4), galleryFolders[folderId])
    fs.readdir(dirPath, function (err, files) {
      if (err) throw err
      for (var fileId in files) {
        if (files[fileId].substring(0, 1) !== '.') {
          imageInfo[galleryFolders[folderId]][files[fileId]] = {}
          console.log(files[fileId])
          try {
            new Exif({ image: path.join(dirPath, files[fileId]) }, function (err, exifData) {
              if (err) logger.exception('scanImages error: ' + err.message)
              else imageInfo[galleryFolders[folderId]][files[fileId]] = exifData
            })
          } catch (error) {
            console.log('Error: ' + error.message)
          }
        }
      }
    })
  }
}
