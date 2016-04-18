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
  for (var dataId in data) {
    if (data[dataId].count === 1) {
      var marker = new google.maps.Marker({
        position: { lat: data[dataId].lat, lng: data[dataId].lon },
        map: map,
        icon: { url: '/thumb/' + galleryName + '/' + data[dataId].images[0],
                scaledSize: new google.maps.Size(50, 50) }
      })
      attachImage(marker, data[dataId].images[0])
      points.push(marker)
    } else {
      var marker = new google.maps.Marker({
        position: { lat: data[dataId].lat, lng: data[dataId].lon },
        map: map,
        icon: {
          anchor: new google.maps.Point(25, 25),
          url: 'data:image/svg+xml;utf-8,' +
          '<svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">' +
          '<path fill="#1C82F3" stroke="#3CA2F3" stroke-width="5" d="M0 0 L0 50 L50 50 L50 0 Z" ></path>' +
          '<text font-family="Arial" text-anchor="middle" x="25" y="30" fill="white">' + data[dataId].count + '</text>' +
          '</svg>'
        }
      })
      var messageContent = '<div class="thumblist">'
      for (var imageId in data[dataId].images) {
        var image = data[dataId].images[imageId]
        messageContent += '<a class="thumb" href="/small/' + galleryName + '/' + image + '" onclick="return showByName(\'' + image + '\')">' +
                  '<img src="/thumb/' + galleryName + '/' + image + '" alt="" /></a>'
      }
      messageContent += '</div>'
      attachMessage(marker, messageContent)
      points.push(marker)
    }
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

function attachImage (marker, imageName) {
  marker.addListener('click', function () {
    showByName(imageName)
  })
}

google.maps.event.addDomListener(window, 'load', initialize)
