
var fs = require('fs')
var path = require('path')
var exif = require('exif-parser')
var config = require('./config/private')

var galleryFolders = []
var imageInfo = []
module.exports.scanExif = scanExif
Object.defineProperty(module.exports, 'galleryFolders', { get: function () { return galleryFolders } })
Object.defineProperty(module.exports, 'imageInfo', { get: function () { return imageInfo } })

// file system backend
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

  try {
    imageInfo = require('./config/imageInfo')
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') scanExif()
    else console.log(e.code)
  }
})

function scanExif () {
  console.log('exif scan started')
  var newImageInfo = {}
  for (var folderId in galleryFolders) {
    console.log(galleryFolders[folderId])
    newImageInfo[galleryFolders[folderId]] = { }
    var galleryPath = path.join(config.originalsPath,
      galleryFolders[folderId].substring(0, 4),
      galleryFolders[folderId])
    var files = fs.readdirSync(galleryPath)

    for (var fileId in files) {
      if (files[fileId].substring(0, 1) !== '.' &&
         (files[fileId].slice(-4).toLowerCase() === '.jpg' || files[fileId].slice(-5).toLowerCase() === '.jpeg')) {
        var newInfo = {}
        try {
          var exifData = exif.create(fs.readFileSync(path.join(galleryPath, files[fileId]))).parse().tags
          if (exifData.GPSLatitudeRef) {
            newInfo.lat = exifData.GPSLatitude
            newInfo.lon = exifData.GPSLongitude
            if (exifData.GPSLatitudeRef === 'S') newInfo.lat *= -1
            if (exifData.GPSLongitudeRef === 'W') newInfo.lon *= -1
            newImageInfo[galleryFolders[folderId]][files[fileId]] = newInfo
          }
        } catch (err) {
          newInfo.exif = err
        }
      }
    }

    console.log(newImageInfo[galleryFolders[folderId]])
  }
  imageInfo = newImageInfo
  fs.writeFile('config/imageInfo.json', JSON.stringify(newImageInfo), function (err) { if (err) console.log('error writing imageInfo: ' + err) })
  console.log('exif scan done')
}
