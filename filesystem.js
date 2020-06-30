'use strict'
var fs = require('fs')
var path = require('path')
var ExifReader = require('exifreader')
var imageThumbnail = require('image-thumbnail')
var heicConvert = require('heic-convert')
var app = require('./app')
var config = require('./config/private')
const { exit } = require('process')

var galleryFolders = []
var imageInfo = []
module.exports.scanExif = scanExif
Object.defineProperty(module.exports, 'galleryFolders', { get: function () { return galleryFolders } })
Object.defineProperty(module.exports, 'imageInfo', { get: function () { return imageInfo } })

module.exports.getAllImageInfo = function (userName) {
  var result = {}
  for (var gallery in app.galleries[userName]) {
    for (var image in imageInfo[gallery]) {
      result[image] = imageInfo[gallery][image]
    }
  }
  return result
}

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

  for (var gallery in imageInfo) {
    for (var file in imageInfo[gallery]) {
      imageInfo[gallery][file].gallery = gallery
    }
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
         (files[fileId].slice(-4).toLowerCase() === '.jpg'
         || files[fileId].slice(-5).toLowerCase() === '.jpeg'
         || files[fileId].slice(-5).toLowerCase() === '.heic')) {
        var newInfo = {}
        try {
          var exifData = ExifReader.load(fs.readFileSync(path.join(galleryPath, files[fileId])), {expanded: true})
          if (exifData.gps) {
            newInfo.lat = exifData.gps.Latitude
            newInfo.lon = exifData.gps.Longitude
            newInfo.alt = exifData.gps.Altitude
            newImageInfo[galleryFolders[folderId]][files[fileId]] = newInfo
          }
        } catch (err) {
          newInfo.exif = err
        }
      }
    }
  }
  imageInfo = newImageInfo
  fs.writeFile('config/imageInfo.json', JSON.stringify(newImageInfo), function (err) { if (err) console.log('error writing imageInfo: ' + err) })
  console.log('exif scan done')
}

module.exports.sendFile = function (req, res, kind) {
  var filePath = decodeURI(req.url).substring(1).split('/')
  // remove .zip extension
  if (kind === 'zip' && filePath[0].slice(-4) === '.zip') {
    filePath[0] = filePath[0].substring(0, filePath[0].length - 4)
  }

  // check if user is authorized to access the file
  if (app.galleries[app.sessions[req.signedCookies.sid]][filePath[0]]) {
    if (kind === 'zip') {
      res.sendFile(filePath[0] + '.zip', { root: path.join(config.cacheZipPath, filePath[0].substring(0, 4)) })
    } else if (kind === 'original') {
      res.sendFile(filePath[1], { root: path.join(config.originalsPath, filePath[0].substring(0, 4), filePath[0]) })
    } else { // kind is small or thumb
      var fileToSend = path.join((kind === 'thumb' ? config.cacheThumbPath : config.cacheSmallPath), filePath[0].substring(0, 4), filePath[0], filePath[1])

      if(!fs.existsSync(fileToSend)) {
        console.log(kind + ' file not found, creating: ' + fileToSend)
        var fileNameOriginal = filePath[1]
        if (fileNameOriginal.slice(-10) === '.heic.jpeg') {
          fileNameOriginal = fileNameOriginal.slice(0, -5)
        }
        var fileOriginal = path.join(config.originalsPath, filePath[0].substring(0, 4), filePath[0], fileNameOriginal)
        if(fileNameOriginal.slice(-5) === '.heic') {
          let fileConvertedToJpeg = path.join(config.cacheJpegPath, filePath[0].substring(0, 4), filePath[0], fileNameOriginal + '.jpeg')
          if(!fs.existsSync(fileConvertedToJpeg)) {
            createJpeg(fileOriginal, fileConvertedToJpeg)
          }
          fileOriginal = fileConvertedToJpeg
        }
        createFile(kind, fileOriginal, fileToSend)
      }
      res.sendFile(fileToSend)
      
      
    }
  } else {
    res.send('403 Forbidden 5')
  }
}

async function createFile(kind, fileOriginal, fileToSend) {
  console.log('createFile ' + fileOriginal + '>' + fileToSend)
  try {
    let options = { percentage: 10, height: (kind == 'thumb' ? 100 : 500), jpegOptions: { force:true, quality:50 }}
    const thumbnail = await imageThumbnail(fileOriginal, options)
    fs.mkdirSync(path.dirname(fileToSend), { recursive: true })
    fs.writeFileSync(fileToSend, thumbnail)
  } catch(e) {
    console.log('error creating file:' + e)
  }
}

async function createJpeg(fileOriginal, fileConvertedToJpeg) {
  console.log('createJpeg ' + fileOriginal + '>' + fileConvertedToJpeg)
  try {
    const inputBuffer = fs.readFileSync(fileOriginal)
    const outputBuffer = await heicConvert({
      buffer: inputBuffer,
      format: 'JPEG',
      quality: 1
    })
    fs.mkdirSync(path.dirname(fileConvertedToJpeg), { recursive: true })
    fs.writeFileSync(fileConvertedToJpeg, outputBuffer)
  } catch(e) {
    console.log('error creating jpeg:' + e)
  }
}