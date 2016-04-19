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

var dataPath = '/mapdata'
var map
var points = []

function initialize () {
  map = new google.maps.Map(document.getElementById('map'), {
    center: new google.maps.LatLng(49.758679, 8.634053),
    zoom: 9,
    mapTypeId: google.maps.MapTypeId.HYBRID
  })

  if (typeof galleryName !== 'undefined') dataPath = '/' + galleryName + dataPath
  loadJSON(dataPath, function (data) {
    drawPoints(data)
  })
}

function drawPoints (data) {
  for (var dataId in data) {
    if (data[dataId].count === 1) {
      var imageName = Object.keys(data[dataId].images)[0]
      var marker = new google.maps.Marker({
        position: { lat: data[dataId].lat, lng: data[dataId].lon },
        map: map,
        icon: { url: '/thumb/' + data[dataId].images[imageName].gallery + '/' + imageName,
                scaledSize: new google.maps.Size(50, 50) }
      })
      attachImage(marker, Object.keys(data[dataId].images)[0])
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
      for (var image in data[dataId].images) {
        var gallery = data[dataId].images[image].gallery
        messageContent += '<a class="thumb" href="/small/' + gallery + '/' + image + '" onclick="return showByName(\'' + image + '\')">' +
                  '<img src="/thumb/' + gallery + '/' + image + '" alt="" /></a>'
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
