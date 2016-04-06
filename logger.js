// includes
var fs = require('fs')
var util = require('util')
var dateFormat = require('dateformat')
var privateConfig = require('./config/private')

// objects
var logger = {}

// Telegram Bot
var Telegram = require('./telegram.js')
var telegram = new Telegram(privateConfig.telegramKey)
function processMessages (messages) {
  for (var i in messages) {
    var m = messages[i].message

    if (m.from.id === privateConfig.telegramTargetId) {
      telegram.sendMessage(privateConfig.telegramTargetId, 'ignored:' + m.text)
    } else {
      telegram.sendMessage(privateConfig.telegramTargetId, 'message from unknown source: ' + util.inspect(m))
    }
  }
  setTimeout(function () { telegram.getMessages(processMessages) }, 2000)
}
telegram.getMessages(processMessages)

// logger
logger.visitor = function (req, user) {
  var visit = {}
  visit.date = Date.now()
  visit.url = req.url
  visit.method = req.method
  visit.body = req.body
  visit.cookie = req.signedCookies
  visit.user = user
  visit.headers = req.headers

  fs.appendFile('log/visit/' + dateFormat(new Date(), 'yyyy-mm-dd') + '.json', JSON.stringify(visit) + ',', function (err) {
    if (err) throw err
  })

  var message = ''
  if (visit.user) {
    message += visit.user + ' '
  } else {
    message += util.inspect(visit.cookie) + ' '
  }
  message += visit.url + ' '
  if (visit.method !== 'GET') {
    message += ' ' + visit.method
  }
  if (Object.keys(visit.body).length !== 0) {
    message += ' ' + util.inspect(visit.body)
  }
  // message += ' ' + util.inspect(visit.headers)

  if (visit.url.substring(0, 7) !== '/thumb/' && visit.url.substring(0, 7) !== '/small/') {
    telegram.sendMessage(privateConfig.telegramTargetId, message)
  }
}

logger.exception = function (err) {
  var now = new Date()
  console.log(now.toISOString() + err)
  fs.appendFile('log/error/' + dateFormat(now, 'yyyy-mm-dd') + '.json', JSON.stringify(err) + ',', function (err) {
    if (err) throw err
  })
}

module.exports = logger
