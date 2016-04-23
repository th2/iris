'use strict'
module.exports.cluster = function (imageList, detailLevel) {
  var clusters = []
  for (var imageId in imageList) {
    var image = imageList[imageId]
    if (image && image.lat && image.lon) {
      var found = false
      for (var clusterId in clusters) {
        if (image.lat.toFixed(detailLevel) === clusters[clusterId].lat.toFixed(detailLevel) &&
            image.lon.toFixed(detailLevel) === clusters[clusterId].lon.toFixed(detailLevel)) {
          clusters[clusterId].count++
          clusters[clusterId].images[imageId] = imageList[imageId]
          found = true
          break
        }
      }
      if (!found) {
        var newCluster = {}
        newCluster.lat = image.lat
        newCluster.lon = image.lon
        newCluster.count = 1
        newCluster.images = {}
        newCluster.images[imageId] = imageList[imageId]
        clusters.push(newCluster)
      }
    }
  }
  return clusters
}
