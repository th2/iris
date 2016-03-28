var express = require('express')
var router = express.Router()
var fs = require('fs')
var util = require('util')
var dateFormat = require('dateformat')
var secureConfig = require('../config/private')

var authorized = []
var invalidLoginAttempts = 0
var lastLoginAttempt = 0

// check if user is authorized
router.use(function (req, res, next) {
  if (authorized[req.signedCookies.sid]) {
    next()
  } else if (10000 * invalidLoginAttempts + lastLoginAttempt > new Date().getTime()) {
    res.send('<style>body { background-color: #444; }</style><script>' +
        'function startTimer(duration, display) { setInterval(function () { display.textContent = --duration }, 1000) }' +
        'window.onload = function () { startTimer(' +
        Math.floor((10000 * invalidLoginAttempts + lastLoginAttempt - new Date().getTime()) / 1000) +
        ', document.querySelector("#time")) }' +
        '</script>' +
        'wait for <span id="time">' +
        Math.floor((10000 * invalidLoginAttempts + lastLoginAttempt - new Date().getTime()) / 1000) +
        '</span> seconds')
  } else if (req.body.adminpw === secureConfig.adminPassword) {
    authorized[req.signedCookies.sid] = true
    invalidLoginAttempts = 0
    next()
  } else {
    var response = ''
    if (req.body.adminpw && req.body.adminpw.length > 0) {
      response = '<style>body { background-color: #444; }</style>wrong password'
      invalidLoginAttempts++
      lastLoginAttempt = new Date().getTime()
    } else {
      response = '<style>body { background-color: #444; }</style>' +
        '<form method="post" action="' + req.baseUrl + req.url + '">' +
        '<input type="password" name="adminpw">' +
        '<input type="submit" value="Submit">' +
        '</form>'
    }
    res.send(response)
  }
})

router.use('/', function (req, res) {
  var today = new Date()
  if (req.url !== '/') {
    today = new Date(parseInt(req.url.substring(1)))
  }
  var yesterday = new Date().setDate(today.getDate() - 1)
  var tomorrow = new Date().setDate(today.getDate() + 1)
  var response = '<a href="' + yesterday + '">' + dateFormat(yesterday, 'yyyy-mm-dd') + '</a> ' +
  dateFormat(today, 'yyyy-mm-dd') +
  ' <a href="' + tomorrow + '">' + dateFormat(tomorrow, 'yyyy-mm-dd') + '</a><br><table>'

  var visits = JSON.parse('[' +
    fs.readFileSync('log/visit/' + dateFormat(today, 'yyyy-mm-dd') + '.json').slice(0, -1) + ']')
  visits.forEach(function (entry) {
    response += '<tr>' +
      '<td>' + new Date(entry.date).toISOString() + '</td>' +
      '<td>' + entry.method + ' ' + entry.url + '</td>' +
      '<td>' + util.inspect(entry.cookie) + '</td>' +
      '<td><input type="text" name="details" value="' + util.inspect(entry.headers) + '"></td></tr>'
  })
  response += '</table>'
  res.send(response)
})

router.use('/settings', function (req, res) {
  res.send('todo')
})

module.exports = router
