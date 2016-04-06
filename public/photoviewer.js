var currentId = 0
var player = false
var playSpeed = 1000

function play () {
  document.getElementById('imageview-play').style.display = 'none'
  document.getElementById('imageview-pause').style.display = 'inline'
  clearInterval(player)
  player = setInterval(function () { show(++currentId) }, playSpeed)
}

function pause () {
  document.getElementById('imageview-play').style.display = 'inline'
  document.getElementById('imageview-pause').style.display = 'none'
  clearInterval(player)
}

function slower () {
  playSpeed += 200
  clearInterval(player)
  player = setInterval(function (){ show(++currentId) }, playSpeed)
}

function faster () {
  playSpeed -= 200
  if (playSpeed < 100)
    playSpeed = 100
  clearInterval(player)
  player = setInterval(function (){ show(++currentId) }, playSpeed)
}

function downloadOriginal () {
  pause()
  window.open('/original/' + galleryName + '/' + fileNames[currentId])
}

function show (fileId) {
  if (fileId < 0) fileId = fileNames.length - 1
  if (fileId > fileNames.length - 1) fileId = 0
  currentId = fileId
  document.getElementById('imageview-image').src = '/small/' + galleryName + '/' + fileNames[fileId]
  document.getElementById('imageview-container').style.display = 'block'
  return false
}

function closeImage () {
  pause()
  document.getElementById('imageview-container').style.display = 'none'
}

window.onkeyup = function (e) {
  var key = e.keyCode ? e.keyCode : e.which
  if (key === 68) downloadOriginal() // d
  else if (key === 37) show(--currentId) // left arrow
  else if (key === 80) play() // p
  else if (key === 39) show(--currentId) // right arrow
  else if (key === 27) closeImage() // escape
  else if (key === 88) closeImage() // x
}
