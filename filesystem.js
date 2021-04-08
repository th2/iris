'use strict'
var fs = require('fs')
var path = require('path')
var archiver = require('archiver')
var ExifReader = require('exifreader')
var imageThumbnail = require('image-thumbnail')
var heicConvert = require('heic-convert')
var ffmpeg = require('fluent-ffmpeg')
var app = require('./app')
var config = require('./config/private')
const { resolve } = require('path')
const { rejects } = require('assert')

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
  if (kind === 'zip' && filePath[0].slice(-4).toLowerCase() === '.zip') {
    filePath[0] = filePath[0].substring(0, filePath[0].length - 4)
  }

  // check if user is authorized to access the file
  if (app.galleries[app.sessions[req.signedCookies.sid]][filePath[0]]) {
    if (kind === 'zip') {
      getZipPath(filePath[0], req.params.type)
        .then(filePath => res.sendFile(filePath))
    } else if (kind === 'original') {
      getOriginalPath(filePath[0], filePath[1])
        .then(filePath => res.sendFile(filePath))
    } else if (kind === 'small') {
      getCachePath(filePath[0], filePath[1], config.cacheSmallPath, 500)
        .then(filePath => res.sendFile(filePath))
    } else if (kind === 'thumb') {
      getCachePath(filePath[0], filePath[1], config.cacheThumbPath, 100)
        .then(filePath => res.sendFile(filePath))
    } else {
      console.log('unknown kind:' + kind)  
      res.send('403 Forbidden')    
    }
  } else {
    res.send('403 Forbidden')
  }
}
async function getZipPath(filePath, type) {
  var cachePath = type === 'jpeg' ? config.cacheJpegPath : config.cacheZipPath
  var originalBasePath = type === 'jpeg' ? config.cacheJpegPath : config.originalsPath
  var originalPath = path.join(originalBasePath, filePath.substring(0, 4), filePath)
  if(type === 'jpeg' && !fs.existsSync(originalPath)) {
    var cachePath = config.cacheZipPath
    var originalPath = path.join(config.originalsPath, filePath.substring(0, 4), filePath)
  }

  var zipPath = path.join(cachePath, filePath.substring(0, 4), filePath + '.zip')
  if(fs.existsSync(zipPath)){
    return zipPath
  }

  await createZip(originalPath, zipPath)
  return zipPath
}

async function getOriginalPath(filePath, fileName) {
  var originalPath = path.join(config.originalsPath, filePath.substring(0, 4), filePath, fileName)
  if(fs.existsSync(originalPath)){
    return originalPath
  }

  //console.log(originalPath + ' requested: fallback to jpeg cache')
  var jpegCachePath = path.join(config.cacheJpegPath, filePath.substring(0, 4), filePath, fileName)
  if(!fs.existsSync(jpegCachePath)){
    console.log('missing original: ' + originalPath)
  }
  return jpegCachePath
}

async function getJpegPath(filePath, fileName) {
  var originalPath = path.join(config.originalsPath, filePath.substring(0, 4), filePath, fileName)

  if(fileName.slice(-5).toLowerCase() === '.heic') {
    var jpegCachePath = path.join(config.cacheJpegPath, filePath.substring(0, 4), filePath, fileName.slice(0, -5) + '.jpeg')
    if(!fs.existsSync(jpegCachePath)){
      await createJpeg(originalPath, jpegCachePath)
    }
    return jpegCachePath
  }

  if(fs.existsSync(originalPath)){
    return originalPath
  }

  console.log('missing jpeg: ' + originalPath)
}

async function getCachePath(filePath, fileName, kindPath, kindSize) {
  var thumbPath = path.join(kindPath, filePath.substring(0, 4), filePath, fileName.slice(0, fileName.lastIndexOf('.')) + '.jpeg')
  if(fs.existsSync(thumbPath)){
    return thumbPath
  }

  var originalPath = await getJpegPath(filePath, fileName)
  console.log('createCacheFile ' + originalPath + '>' + thumbPath)
  try {
    fs.mkdirSync(path.dirname(thumbPath), { recursive: true })
    if(originalPath.substr(-4).toLowerCase() == '.mov') {
      new ffmpeg(originalPath)
        .screenshot({
            count: 1,
            filename: thumbPath.substring(thumbPath.lastIndexOf('/') + 1),
            size: '?x100'
          }, thumbPath.substring(0, thumbPath.lastIndexOf('/')), function(err) {
          console.log('screenshots were saved')
        })
    } else {
      let options = { percentage: 10, height: kindSize, jpegOptions: { force:true, quality:50 }}
      const thumbnail = await imageThumbnail(originalPath, options)
      fs.writeFileSync(thumbPath, thumbnail)
    }
  } catch(e) {
    console.log('error creating file:' + e)
  }

  return thumbPath
}

async function createZip(originalPath, zipPath) {
  console.log('createZip ' + originalPath + '>' + zipPath)
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(zipPath.slice(0, zipPath.lastIndexOf('/'))), { recursive: true })
    var output = fs.createWriteStream(zipPath)
    var archive = archiver('zip', { zlib: { level: 9 }})
    archive.pipe(output)
    archive.directory(originalPath, false)
    archive.finalize()

    output.on('close', () => {
      console.log('createZip ' + zipPath + ' done: ' + archive.pointer() + ' total bytes')
      resolve(archive)
    });
		archive.on('error', (err) => reject(err));
  })
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