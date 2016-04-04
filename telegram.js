'use strict'
var util = require('util')
var https = require('https')
var logger = require('./logger.js')

module.exports = function (key) {
  var baseURL = 'https://api.telegram.org/bot' + key + '/'
  var offset = 0

  function query (url, callback) {
    https.get(url, function (res) {
      var body = ''
      res.on('data', function (chunk) { body += chunk })
      res.on('end', function () {
        try {
          var result = JSON.parse(body)
          if (result && result.ok) {
            if (result.result.length > 0) {
              offset = result.result[result.result.length - 1].update_id + 1
            }
            callback(result)
          } else {
            logger.error('telegram query not ok: ' + util.inspect(result))
          }
        } catch (e) {
          logger.error('telegram query failed: ' + e)
        }
      })
    }).on('error', function (e) {
      logger.error('telegram query returned error: ' + e)
    })
  }

  this.sendMessage = function (id, text) {
    var url = baseURL + 'sendMessage?chat_id=' + id + '&text=' + encodeURIComponent(text)
    query(url, function () {})
  }

  this.sendMessageMarkup = function (id, text, markup) {
    var url = baseURL + 'sendMessage?chat_id=' + id + '&text=' + encodeURIComponent(text) +
    '&reply_markup=' + encodeURIComponent(markup)
    query(url, function () {})
  }

  this.getMessages = function (callback) {
    var url = baseURL + 'getUpdates'
    if (offset > 0) {
      url += '?offset=' + offset
    }

    var check = function (updates) {
      if (!updates) {
        setTimeout(function () { query(url, check) }, 10000)
      } else {
        callback(updates.result)
      }
    }

    query(url, check)
  }
}
