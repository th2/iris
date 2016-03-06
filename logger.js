// includes
var fs = require('fs')

// objects
var logger = {}

// logger
logger.visitor = function (url, method, cookie, headers) {
  var visit = {}
  visit.date = Date.now()
  visit.url = url
  visit.method = method
  visit.cookie = cookie
  visit.headers = headers

  fs.appendFile('log/visit/' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(visit) + ',', function (err) {
    if (err) throw err
  })
}

logger.error = function (err) {
  var now = new Date().toISOString()
  console.log(now + err)
  fs.appendFile('log/error/' + now.slice(0, 10) + '.json', JSON.stringify(err) + ',', function (err) {
    if (err) throw err
  })
}

module.exports = logger
