var currentSearch = window.location.search;
var map = null;
var polygon = null;

var BlueRide = new SanMapType(1, 3, function (zoom, x, y) {
    return x == -1 && y == -1 ? "https://artic.leosight.cz/design/mapa/tiles/map.outer.png" :
        "https://artic.leosight.cz/design/mapa/tiles/map." + zoom + "." + x + "." + y + ".png";
});

function initMapWithData(mapData) {
    map = SanMap.createMap(document.getElementById('map-canvas'), {
        BlueRide
    }, -1, null, false);

    var center = mapData && mapData.center ? mapData.center : { lat: -2.8, lng: -63.8 };
    var zoom = mapData && mapData.zoom ? mapData.zoom : 6;

    map.setCenter(center);
    map.setZoom(zoom);

    var coords = mapData && mapData.polygon && mapData.polygon.coordinates ? mapData.polygon.coordinates : [
        { lat: -8.43615, lng: -62.8884 },
        { lat: -2.256738, lng: -62.8941 },
        { lat: -2.249706, lng: -64.7148 },
        { lat: -4.79829, lng: -64.7112 },
        { lat: -5.25255, lng: -64.8081 },
        { lat: -5.64, lng: -65.067 },
        { lat: -5.90322, lng: -65.454 },
        { lat: -5.9946, lng: -65.913 },
        { lat: -5.99718, lng: -66.0627 },
        { lat: -8.43861, lng: -66.0639 }
    ];

    var style = mapData && mapData.polygon && mapData.polygon.style ? mapData.polygon.style : {
        strokeColor: '#ffffff',
        strokeOpacity: 1,
        strokeWeight: 2,
        fillColor: '#6592e6',
        fillOpacity: 0.5
    };

    polygon = new google.maps.Polygon({
        paths: coords,
        strokeColor: style.strokeColor || '#ffffff',
        strokeOpacity: style.strokeOpacity !== undefined ? style.strokeOpacity : 1,
        strokeWeight: style.strokeWeight !== undefined ? style.strokeWeight : 2,
        fillColor: style.fillColor || '#6592e6',
        fillOpacity: style.fillOpacity !== undefined ? style.fillOpacity : 0.5
    });
    polygon.setMap(map);
}

function initMapDefault() {
    initMapWithData(null);
}
