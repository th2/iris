// config //
var config = require('../config/private')
var pathImport = config.originalsPath
var pathCache = config.cachePath

// include //
var util = require('util')
var fs = require('fs')
var path = require('path')
var exec = require('child_process').execSync
var mkdirp = require('mkdirp')

// prototype extensions //
String.prototype.startsWith = function (needle) {
  return (this.indexOf(needle) === 0)
}

String.prototype.endsWith = function(suffix) {
  return this.indexOf(suffix, this.length - suffix.length) !== -1
}

function arraysEqual (a, b) {
  if (a === b) return true
  if (a == null || b == null) return false
  if (a.length !== b.length) return false

  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false
  }
  return true
}

function contains (a, obj) {
  var i = a.length
  while (i--) {
    if (a[i] === obj) {
      return true
    }
  }
  return false
}

// helper functions //
function runTask (prog, param) {
  console.log('running task: ' + prog + ' ' + param)
  var task = child.spawn(prog, param)
  task.stdout.on('data', function (buffer) { console.log(buffer.toString()) })
  task.stdout.on('end', function () {
    console.log('task done: ' + prog + ' ' + param)
  })
}
function runTaskQuiet (prog, param) {
  var task = child.spawn(prog, param)
  task.stdout.on('data', function (buffer) { console.log(buffer.toString()) })
  task.stdout.on('end', function () { })
}

// main //
var years = fs.readdirSync(pathImport)

for (var i in years) {
  if (!years[i].startsWith('.')) {
    processYear(years[i])
  }
}

function processYear (year) {
  var albums = fs.readdirSync(pathImport + '/' + year)
  console.log('year ' + year + ': ' + albums.length + ' galleries')
  for (var i in albums) {
    if (!albums[i].startsWith('.')) {
      processAlbum(year, albums[i])
    }
  }
}

function processAlbum (year, album) {
  var pathOrg = pathImport + '/' + year + '/' + album
  var itemsOrg = fs.readdirSync(pathOrg).filter((item) => !(/(^|\/)\.[^\/\.]/g).test(item))

  var pathThumb = pathCache + '/thumb/' + year + '/' + album
  mkdirp.sync(pathThumb)
  var itemsThumb = fs.readdirSync(pathThumb).filter((item) => !(/(^|\/)\.[^\/\.]/g).test(item))
  var checkThumb = arraysEqual(itemsOrg, itemsThumb)

  var pathSmall = pathCache + '/small/' + year + '/' + album
  mkdirp.sync(pathSmall)
  var itemsSmall = fs.readdirSync(pathSmall).filter((item) => !(/(^|\/)\.[^\/\.]/g).test(item))
  var checkSmall = arraysEqual(itemsOrg, itemsSmall)

  var pathZip = pathCache + '/zip/' + year
  mkdirp.sync(pathZip)
  var checkZip
  try {
    fs.accessSync(pathZip + '/' + album.replace(/ /g, '_') + '.zip', fs.F_OK)
    checkZip = true
  } catch (e) {
    checkZip = false
  }

  console.log(year + '/' + album)

  if (!checkThumb) {
    for (var i in itemsOrg) {
      console.log('thumb:' + pathOrg + '/' + itemsOrg[i])
      if (!itemsOrg[i].startsWith('.') &&
        itemsOrg[i].endsWith('.jpg')) {
        exec('convert -define jpeg:size=200x200 "' +
          pathOrg + '/' + itemsOrg[i] +
          '" -thumbnail 100x100^ -gravity center -extent 100x100 "' +
          pathThumb + '/' + itemsOrg[i] + '"')
      } else {
        exec('convert -size 100x100 xc:none "png:' +
          pathThumb + '/' + itemsOrg[i] + '"')
      }
    }
  }

  if (!checkSmall) {
    for (var i in itemsOrg) {
      console.log('small:' + pathOrg + '/' + itemsOrg[i])
      if (!itemsOrg[i].startsWith('.') &&
        itemsOrg[i].endsWith('.jpg')) {
        exec('convert "' +
          pathOrg + '/' + itemsOrg[i] +
          '" -thumbnail \'1000x1000>\' "' +
          pathSmall + '/' + itemsOrg[i] + '"')
      } else {
        exec('convert -size 100x100 xc:none "png:' +
          pathSmall + '/' + itemsOrg[i] + '"')
      }
    }
  }

  if (!checkZip) {
    console.log('zip:' + pathOrg)
    //exec('zip -r "' + pathZip + '/' + album.replace(/ /g, '_') + '.zip" "' + pathOrg + '"')
    exec('pushd "' + pathOrg + '"; zip -r "' + pathZip + '/' + album.replace(/ /g, '_') + '.zip" .; popd')
  }
}


//taskStack.push(['zip', ['-r', dirs[i].replace('/ /g','\\ '), dirs[i].replace('/ /g','\\ ')]])


    // mogrify -quality 50 -resize 1000x1000 -auto-orient *.jpg
    // convert infile.jpg -quality 50 -resize 1000x1000 -auto-orient outfile.jpg
