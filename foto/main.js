var express = require('express')
var router = express.Router()
var fs = require('fs')
var path = require('path')
var privateConfig = require('../private')

router.get('/', function (req, res) {
  res.send('ok')
  console.log(albums)
})

module.exports = router

// file system backend
var albums = []

fs.readdir(privateConfig.originalsPath, function (err, files) {
  if (err) throw err
  for (var i in files) {
    if (files[i].substring(0, 1) !== '.') {
      var albumFiles = fs.readdirSync(privateConfig.originalsPath + path.sep + files[i])
      for (var j in albumFiles) {
        if (albumFiles[j].substring(0, 1) !== '.') {
          albums.push(albumFiles[j])
        }
      }
    }
  }
})
