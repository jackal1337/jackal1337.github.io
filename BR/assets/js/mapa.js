var currentSearch = window.location.search;

var BlueRide = new SanMapType(1, 3, function (zoom, x, y) {
    return x == -1 && y == -1 ? "https://artic.leosight.cz/design/mapa/tiles/map.outer.png" :
        "https://artic.leosight.cz/design/mapa/tiles/map." + zoom + "." + x + "." + y + ".png";
});

var map = SanMap.createMap(document.getElementById('map-canvas'), {
    BlueRide
}, -1, null, false);

var bluerideLocation = {
    lat: -2.8,
    lng: -63.8
};
map.setCenter(bluerideLocation);
map.setZoom(6);

var blueride = [{
    lat: -8.43615,
    lng: -62.8884
}, {
    lat: -2.256738,
    lng: -62.8941
}, {
    lat: -2.249706,
    lng: -64.7148
}, {
    lat: -4.79829,
    lng: -64.7112
}, {
    lat: -5.25255,
    lng: -64.8081
}, {
    lat: -5.64,
    lng: -65.067
}, {
    lat: -5.90322,
    lng: -65.454
}, {
    lat: -5.9946,
    lng: -65.913
}, {
    lat: -5.99718,
    lng: -66.0627
}, {
    lat: -8.43861,
    lng: -66.0639
}, ];
var blueride = new google.maps.Polygon({
    paths: blueride,
    strokeColor: '#ffffff',
    strokeOpacity: 1,
    strokeWeight: 2,
    fillColor: '#6592e6',
    fillOpacity: 0.5
});
blueride.setMap(map);