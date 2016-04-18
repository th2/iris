function loadJSON (path, callback) {
  var req = new XMLHttpRequest()
  req.onreadystatechange = function () {
    if (req.readyState === XMLHttpRequest.DONE) {
      if (req.status === 200) callback(JSON.parse(req.responseText))
      else console.error(req)
    }
  }
  req.open('GET', path, true)
  req.send()
}

var map
var points = []

function initialize () {
  map = new google.maps.Map(document.getElementById('map'), {
    center: new google.maps.LatLng(49.758679, 8.634053),
    zoom: 9,
    mapTypeId: google.maps.MapTypeId.HYBRID
  })

  loadJSON('/' + galleryName + '/mapdata', function (data) {
    drawPoints(data)
  })
}

function drawPoints (data) {
  for (var imageId in data) {
    var marker = new google.maps.Marker({
      position: { lat: data[imageId].lat, lng: data[imageId].lon },
      map: map
    })
    attachMessage(marker, data[imageId].count + ' images')
    points.push(marker)
  }
}

function attachMessage (marker, message) {
  var infoWindow = new google.maps.InfoWindow({
    content: message
  })
  marker.addListener('click', function () {
    infoWindow.open(marker.get('map'), marker)
  })
}

google.maps.event.addDomListener(window, 'load', initialize)
