var scrollbackList = []
var scrollbackPointer = 0
var scrollbackActive = false

function remember (input) {
  var index = scrollbackList.indexOf(input)
  if (index > -1) scrollbackList.splice(index, 1)
  scrollbackList.push(input)
  scrollbackActive = false
}

function parse (input) {
  remember(input)
  document.getElementById('input').value = ''
  out('<span class="inlog">' + input + '</span>')

  var request = new XMLHttpRequest()
  request.onreadystatechange = function () {
    if (request.readyState === 4 && request.status === 200) {
      out(request.responseText)
    }
  }
  request.open('GET', '/c/' + input, true)
  request.send()

  /* $.ajax({
    url: 'http://hehmann.com/',
    type: 'GET',
    data: 'i=0&c=' + encodeURIComponent(inp),
    success: function (data) {
      if (data.indexOf('{clear}') === 0) {
        $("#output").empty()
        out('<span class="inlog">' + inp + '</span>')
      } else if (data.indexOf('{background-image=') === 0) {
        // $('body').css('background-image','url('+data.substring(18,data.indexOf('}'))+')')
        $('#supersized').show()
        $.supersized({slides: [{image: data.substring(18, data.indexOf('}')), title: ''}]})
        out(data.substring(data.indexOf('}') + 1))
      } else if(data.indexOf('{background-color=') === 0) {
        //$('body').css('background-image','url()')
        $('#supersized').hide()
        $('body').css('background-color', data.substring(18, data.indexOf('}')))
        out(data.substring(data.indexOf('}') + 1))
      } else {
        out(data)
      }
    },
    error: function (e) {
      out('<span class="inlog">' + inp + '</span>')
      out('Error: Could not connect to server, try again or refresh the page.')
    }
  })*/
}

function out (text) {
  document.getElementById('output').innerHTML += text + '<br>'
  /*
    $('.cmd').off('click') // $(this).unbind().click();
  $('.cmd').each(function (index) {
      $(this).click(function (event) {
        event.preventDefault()
        parse( $(this).attr('href').substring(3) )
    })
  })
  $('html, body').animate({ scrollTop: $(document).height() }, 300)*/
}

/*function atw (cmds) {
  $('#output').empty()
  $('#output').append('<div id="title"><a href="http://hehmann.com/">thorben.<span class="green">hehmann.com</span></a></div><br>')
  $('#input').typewriter({ text: cmds })
}*/

window.addEventListener('load', function () {
  document.getElementById('input').focus()
}, false)

window.addEventListener('click', function () {
  document.getElementById('input').focus()
}, false)

document.getElementById('input').onkeyup = function (e) {
  if (e.keyCode === 13) {
    if (document.getElementById('input').value !== '') {
      parse(document.getElementById('input').value)
    }
  } else if (e.keyCode === 38) {
    if (!scrollbackActive) {
      scrollbackActive = true
      if (document.getElementById('input').value !== '') {
        scrollbackList.push(document.getElementById('input').value)
        scrollbackPointer = scrollbackList.length - 1
      } else {
        scrollbackPointer = scrollbackList.length
      }
    }
    if (scrollbackPointer > 0) {
      scrollbackPointer--
      document.getElementById('input').value = scrollbackList[scrollbackPointer]
    }
  } else if (e.keyCode === 40) {
    if (scrollbackActive) {
      if (scrollbackPointer < scrollbackList.length) {
        scrollbackPointer++
        document.getElementById('input').value = scrollbackList[scrollbackPointer]
      }
    }
  }
}

// $('body').css('background-image','url(/wallpaper/3228.jpg)')
/*
$('.cmd').click(function (event) {
  event.preventDefault()
  $(this).attr('href', function () {
    parse($(this).attr('href').substring(3))
  }).unbind().click()
})
*/
