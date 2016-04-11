var express = require('express')
var router = express.Router()
var fs = require('fs')
var path = require('path')

router.use('/', function (req, res) {
  res.send(reply(req.url.substring(1)))
})

module.exports = router

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
            return 'file ' + dat + ' does not exist'
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
        var dir = path.join('./files/', dat)
        if (dir.substring(0, 6) === 'files/') {
          try {
            var files = fs.readdirSync(dir)
            var result = ''
            for (var i in files) {
              if (files[i].substring(0, 1) !== '.') {
                result += files[i] + '<br>'
              }
            }
            return result
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
