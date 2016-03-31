// config
var httpListenerPort = 80
// TODO: use protocol version
// var protocolVersion = 1

// includes
var fs = require('fs')
var express = require('express')
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser')
var path = require('path')
var logger = require('./logger')
var privateConfig = require('./config/private')
// var http = require('http')
// var knownHosts = require('./config/hosts')

// objects
var httpListener = express()

// [http handler]
// use public folder, cookieParser and json bodyParser
httpListener.use(express.static('public'))
httpListener.use(cookieParser(privateConfig.cookieSecret))
httpListener.use(bodyParser.urlencoded({ extended: true }))
httpListener.use(bodyParser.json())

// access logging
httpListener.use(function (req, res, next) {
  if (req.signedCookies.sid === undefined) {
    // set a new cookie
    var random = Math.random().toString(36).substring(2) + Date.now().toString(36)
    res.cookie('sid', random, { maxAge: 31536000, httpOnly: true, signed: true })
  }
  logger.visitor(req)
  next()
})

// internal communication
var network = require('./network')
httpListener.use('/network', network)

// admin panel
var visit = require('./admin/visit')
httpListener.use('/admin', visit)

// photo gallery
var photo = require('./photo/main')
httpListener.use('/photo', photo)
httpListener.use('/photos', photo)
httpListener.use('/foto', photo)
httpListener.use('/fotos', photo)

// all other paths
httpListener.use('/', function (req, res) {
  if (req.url === '/') {
    fs.readFile('template/index.html', 'utf-8', function (err, page) {
      if (err) {
        res.send('404')
      } else {
        var cmds = [ 'cat welcome.page', 'contact' ]
        var response = ''
        for (var i in cmds) {
          response += '<span class="inlog">' + cmds[i] + '</span><br>'
          response += reply(cmds[i])
        }
        page = page.replace('{{cmdlog}}', response)

        res.contentType('text/html')
        res.send(page)
      }
    })
  } else if (req.url.substring(0, 3) === '/c/') {
    res.send(reply(req.url.substring(3)))
  } else {
    res.send('404')
  }
})

function reply (query) {
  query = decodeURI(query)
  if (query === 'contact') query = 'cat contact.page'
  if (query === 'color') query = 'wall color'
  if (query === 'help') query = 'cat help.page'
  if (query === 'snake') query = 'cat snake.page'

  var cmd = query
  var dat = ''
  var firstSpace = query.indexOf(' ')
  if (firstSpace > -1) {
    cmd = query.substring(0, firstSpace)
    dat = query.substring(firstSpace + 1)
  }

  switch (cmd.toLowerCase()) {
    case 'cat':
      if (dat === '' || dat === '-h' || dat === '-help' || dat === '--help') {
        return 'cat FILENAME - print file with name FILENAME'
      } else {
        if (path.dirname('files/' + dat).substring(0, 5) === 'files') {
          try {
            return fs.readFileSync('files/' + dat)
          } catch (err) {
            return 'no such file'
          }
        } else {
          return ''
        }
      }

      /* $echo .= 'cat: <span class="cmd ls_'.$dat.'">'.$dat.'</span>: Is a directory';
        else
          $echo .= file_get_contents(realpath($dat));
      else
        $echo .= 'cat: cannot access '.$dat.': No such file';
          break;*/
    case 'clear': return '{clear}'
    case 'echo': return dat
    case 'emacs': return 'emacs is not available, try <span class="cmd vi">vi</span>.'
    case 'ls':
      if (dat === '-h' || dat === '-help' || dat === '--help') {
        return 'ls DIRECTORY - list all files with DIRECTORY'
      } else {
        var dir = path.join('files/', dat)
        console.log('aaa' + path.dirname(dir))
        if (path.dirname(dir).substring(0, 5) === 'files') {
          try {
            return fs.readdirSync(dir)
          } catch (err) {
            return 'no such directory'
          }
        } else {
          return ''
        }
      }
    case 'make':
      if (dat === 'me a sandwich') return 'What? Make it yourself.'
      else return 'make: *** No rule to make target \'' + cmd + '\'.  Stop.'
    case 'stats': return 'comming soon'
    case 'sudo':
      if (dat === 'make me a sandwich') return 'Okay.'
      else return 'username is not in the sudoers file. This incident will be reported.'
    case 'test': return 'true'
    case 'vi': return 'vi is not available, try <span class="cmd emacs">emacs</span>.'
    case 'vim': return 'vim is not available, try <span class="cmd emacs">emacs</span>.'
    default: return '<span class="error">Could not understand command "' + query + '", try <span class="cmd help">help</span>.</span>'
  }
}

function startHttpListener (callback) {
  httpListener.listen(httpListenerPort, function () {
    console.log('http handler listening on port ' + httpListenerPort)
    callback()
  }).on('error', function (err) {
    if (err.errno === 'EACCES' || err.errno === 'EADDRINUSE') {
      console.log('counld not start http handler on port ' + httpListenerPort)
      if (httpListenerPort === 80) {
        httpListenerPort = 8080
      } else {
        httpListenerPort++
      }
      startHttpListener(callback)
    } else {
      logger.error(err)
    }
  })
}

/* function connectNetwork () {
  knownHosts.forEach(function (node) {
    var request = http.request({ host: node.host + ':' + node.port, path: '/network' }, function (response) {
      var page = ''

      response.on('data', function (chunk) {
        page += chunk
      })

      response.on('end', function () {
        if (page === 'ok') {
          node.connected = true
        } else {
          console.log('unexpected reply ' + page)
        }
      })
    })
    request.on('error', function (err) {
      if(err.errno === 'ENOTFOUND')
        node.online = false
      else
        logger.error(err)
    })
    request.end()
  })
}

startHttpListener(connectNetwork)*/

startHttpListener(function () {})
