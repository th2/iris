
var fs = require('fs')
var path = require('path')
var exifReader = require('exif-reader')
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
  // scanExif()
})

function scanExif () {
  for (var folderId in galleryFolders) {
    imageInfo[galleryFolders[folderId]] = {}
    var galleryPath = path.join(config.originalsPath, galleryFolders[folderId].substring(0, 4), galleryFolders[folderId])
    var files = fs.readdirSync(galleryPath)

    for (var fileId in files) {
      if (files[fileId].substring(0, 1) !== '.' &&
         (files[fileId].slice(-4).toLowerCase() === '.jpg' || files[fileId].slice(-5).toLowerCase() === '.jpeg')) {
        imageInfo[galleryFolders[folderId]][files[fileId]] = readExif(path.join(galleryPath, files[fileId])).gps
      }
    }
  }
}

function readExif (filename) {
  var fd = fs.openSync(filename, 'r')
  var buffer = new Buffer(512)
  var data = exifReader(searchExif(fd, buffer, 0))
  fs.closeSync(fd)
  return data
}

function searchExif (fd, buffer, fileOffset) {
  var offset = 0
  var length = buffer.length
  var bytesRead = fs.readSync(fd, buffer, 0, length, null)
  if (!bytesRead) {
    return null
  }
  while (offset < length) {
    if (buffer[offset++] === 0xFF && buffer[offset++] === 0xE1) {
      var exifBuffer = new Buffer(buffer.readUInt16BE(offset))
      fs.readSync(fd, exifBuffer, 0, exifBuffer.length, fileOffset + offset + 2)
      return exifBuffer
    }
  }
  return null
}
