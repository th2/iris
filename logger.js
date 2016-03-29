// includes
var fs = require('fs')
var dateFormat = require('dateformat')

// objects
var logger = {}

// logger
logger.visitor = function (req) {
  var visit = {}
  visit.date = Date.now()
  visit.url = req.url
  visit.method = req.method
  visit.body = req.body
  visit.cookie = req.signedCookies
  visit.headers = req.headers

  fs.appendFile('log/visit/' + dateFormat(new Date(), 'yyyy-mm-dd') + '.json', JSON.stringify(visit) + ',', function (err) {
    if (err) throw err
  })
}

logger.error = function (err) {
  var now = new Date()
  console.log(now.toISOString() + err)
  fs.appendFile('log/error/' + dateFormat(now, 'yyyy-mm-dd') + '.json', JSON.stringify(err) + ',', function (err) {
    if (err) throw err
  })
}

module.exports = logger
